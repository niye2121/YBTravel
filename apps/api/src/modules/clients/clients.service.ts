import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { Pool, PoolClient } from "pg";
import type { Client, CreateClientInput, UpdateClientInput } from "@yb-travel/shared";
import { recordAudit } from "../../database/audit";
import { PG_POOL } from "../../database/database.module";
import { OnboardingService } from "./onboarding.service";

type ClientRow = {
  id: number;
  name: string;
  client_type: "household" | "company" | "individual";
  is_demo: boolean;
  phone_number: string | null;
  preferred_rep_id: number | null;
  preferred_rep_name: string | null;
  secondary_rep_id: number | null;
  secondary_rep_name: string | null;
  booking_fee_group_id: number | null;
  booking_fee_group_name: string;
  stage: string;
  stage_name: string;
  created_at: string;
};

function toClient(row: ClientRow): Client {
  return {
    id: row.id,
    name: row.name,
    clientType: row.client_type,
    isDemo: row.is_demo,
    phoneNumber: row.phone_number,
    preferredRepId: row.preferred_rep_id,
    preferredRepName: row.preferred_rep_name,
    secondaryRepId: row.secondary_rep_id,
    secondaryRepName: row.secondary_rep_name,
    bookingFeeGroupId: row.booking_fee_group_id,
    bookingFeeGroupName: row.booking_fee_group_name,
    stage: row.stage,
    stageName: row.stage_name,
    createdAt: row.created_at,
  };
}

const SELECT_CLIENT = `
  SELECT c.id, c.name, c.client_type, c.is_demo, c.phone_number, c.stage,
         COALESCE(os.name, initcap(replace(c.stage, '_', ' '))) AS stage_name,
         c.created_at,
         c.booking_fee_group_id,
         COALESCE(bfg.name, initcap(replace(c.fee_group, '_', ' '))) AS booking_fee_group_name,
         c.preferred_rep_id, pu.name AS preferred_rep_name,
         c.secondary_rep_id, su.name AS secondary_rep_name
  FROM clients c
  LEFT JOIN booking_fee_groups bfg ON bfg.id = c.booking_fee_group_id
  LEFT JOIN onboarding_stages os ON os.code = c.stage
  LEFT JOIN users pu ON pu.id = c.preferred_rep_id
  LEFT JOIN users su ON su.id = c.secondary_rep_id
`;

export type ClientTravellerRow = {
  id: number;
  name: string;
  dob: string | null;
  passportStatus: string;
  relationship: string | null;
  isDemo: boolean;
};

@Injectable()
export class ClientsService {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly onboarding: OnboardingService,
  ) {}

  async list(): Promise<Client[]> {
    const result = await this.pool.query<ClientRow>(
      `${SELECT_CLIENT}
       WHERE NOT c.is_demo
          OR COALESCE((SELECT demo_data_enabled FROM system_settings WHERE id = 1), false)
       ORDER BY c.name ASC`,
    );
    return result.rows.map(toClient);
  }

  /**
   * A plain name list for the rep-picker on the client form. Deliberately
   * separate from GET /users (AdminGuard-protected, returns email + roles
   * too) — any logged-in staff member needs to pick a rep when creating a
   * client (P1-10), not just admins, and shouldn't need admin rights just
   * to see coworkers' names.
   */
  async listReps(): Promise<{ id: number; name: string }[]> {
    const result = await this.pool.query<{ id: number; name: string }>(
      "SELECT id, name FROM users ORDER BY name ASC",
    );
    return result.rows;
  }

  async create(input: CreateClientInput, actorUserId: number): Promise<Client> {
    const dbClient = await this.pool.connect();
    try {
      await dbClient.query("BEGIN");
      const phoneNumber = normalizePhoneNumber(input.phoneNumber);

      let conversationBefore: { id: number; phoneNumber: string; clientId: number | null } | null = null;
      if (input.conversationId) {
        const conversationResult = await dbClient.query<{
          id: number;
          phone_number: string;
          client_id: number | null;
        }>("SELECT id, phone_number, client_id FROM conversations WHERE id = $1 FOR UPDATE", [
          input.conversationId,
        ]);
        const conversation = conversationResult.rows[0];
        if (!conversation) throw new BadRequestException("WhatsApp conversation not found");
        if (!phoneNumber || phoneDigits(phoneNumber) !== phoneDigits(conversation.phone_number)) {
          throw new BadRequestException("Client phone number must match the WhatsApp conversation");
        }
        conversationBefore = {
          id: conversation.id,
          phoneNumber: conversation.phone_number,
          clientId: conversation.client_id,
        };

        if (conversation.client_id !== null) {
          const linked = await loadClientById(dbClient, conversation.client_id);
          await dbClient.query("COMMIT");
          return linked;
        }

        const existing = await findClientByPhone(dbClient, phoneNumber);
        if (existing) {
          await dbClient.query("UPDATE conversations SET client_id = $2 WHERE id = $1", [
            conversation.id,
            existing.id,
          ]);
          await recordAudit(
            dbClient,
            actorUserId,
            "conversation.client_linked",
            "conversation",
            conversation.id,
            conversationBefore,
            { ...conversationBefore, clientId: existing.id },
          );
          await dbClient.query("COMMIT");
          return loadClientById(this.pool, existing.id);
        }
      }

      await assertUniqueClientPhone(dbClient, phoneNumber);

      const feeGroup = await dbClient.query(
        "SELECT 1 FROM booking_fee_groups WHERE id = $1 AND active = true",
        [input.bookingFeeGroupId],
      );
      if ((feeGroup.rowCount ?? 0) === 0) {
        throw new BadRequestException("Select an active booking fee group");
      }

      const inserted = await dbClient.query<{ id: number }>(
        `INSERT INTO clients
           (name, client_type, phone_number, preferred_rep_id, secondary_rep_id, booking_fee_group_id)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [
          input.name.trim(),
          input.clientType,
          phoneNumber,
          input.preferredRepId ?? null,
          input.secondaryRepId ?? null,
          input.bookingFeeGroupId,
        ],
      );
      const id = inserted.rows[0]?.id;
      if (!id) throw new Error("Failed to create client");
      await this.onboarding.recordInitialStage(dbClient, id, "new_inquiry", actorUserId);

      if (conversationBefore) {
        await dbClient.query("UPDATE conversations SET client_id = $2 WHERE id = $1", [
          conversationBefore.id,
          id,
        ]);
      }

      const result = await dbClient.query<ClientRow>(`${SELECT_CLIENT} WHERE c.id = $1`, [id]);
      const row = result.rows[0];
      if (!row) throw new Error("Failed to load created client");
      const created = toClient(row);
      await recordAudit(dbClient, actorUserId, "client.created", "client", id, null, created);
      if (conversationBefore) {
        await recordAudit(
          dbClient,
          actorUserId,
          "conversation.client_linked",
          "conversation",
          conversationBefore.id,
          conversationBefore,
          { ...conversationBefore, clientId: id },
        );
      }
      await dbClient.query("COMMIT");
      return created;
    } catch (error) {
      await dbClient.query("ROLLBACK");
      if (isClientPhoneConstraintError(error)) {
        throw new ConflictException("This phone number is already linked to another client");
      }
      throw error;
    } finally {
      dbClient.release();
    }
  }

  async update(id: number, input: UpdateClientInput, actorUserId: number): Promise<Client> {
    const dbClient = await this.pool.connect();
    try {
      await dbClient.query("BEGIN");
      const locked = await dbClient.query<{ is_demo: boolean }>(
        "SELECT is_demo FROM clients WHERE id = $1 FOR UPDATE",
        [id],
      );
      const target = locked.rows[0];
      if (!target) throw new NotFoundException("Client not found");
      if (target.is_demo) throw new BadRequestException("Demo clients are read-only");
      const phoneNumber = normalizePhoneNumber(input.phoneNumber);
      await assertUniqueClientPhone(dbClient, phoneNumber, id);

      const [beforeResult, feeGroupResult, stageResult] = await Promise.all([
        dbClient.query<ClientRow>(`${SELECT_CLIENT} WHERE c.id = $1`, [id]),
        dbClient.query("SELECT 1 FROM booking_fee_groups WHERE id = $1 AND active = true", [
          input.bookingFeeGroupId,
        ]),
        dbClient.query("SELECT 1 FROM onboarding_stages WHERE code = $1 AND active = true", [
          input.stage,
        ]),
      ]);
      const beforeRow = beforeResult.rows[0];
      if (!beforeRow) throw new NotFoundException("Client not found");
      if ((feeGroupResult.rowCount ?? 0) === 0) {
        throw new BadRequestException("Select an active booking fee group");
      }
      if ((stageResult.rowCount ?? 0) === 0) {
        throw new BadRequestException("Select an active onboarding stage");
      }
      await this.onboarding.applyStageTransition(
        dbClient,
        id,
        beforeRow.stage,
        input.stage,
        input.onboardingTransitionReason ?? null,
        actorUserId,
      );

      await dbClient.query(
        `UPDATE clients
         SET name = $2, client_type = $3, phone_number = $4,
             preferred_rep_id = $5, secondary_rep_id = $6,
             booking_fee_group_id = $7, stage = $8
         WHERE id = $1`,
        [
          id,
          input.name,
          input.clientType,
          phoneNumber,
          input.preferredRepId,
          input.secondaryRepId,
          input.bookingFeeGroupId,
          input.stage,
        ],
      );

      const afterResult = await dbClient.query<ClientRow>(`${SELECT_CLIENT} WHERE c.id = $1`, [id]);
      const afterRow = afterResult.rows[0];
      if (!afterRow) throw new NotFoundException("Client not found");
      const before = toClient(beforeRow);
      const updated = toClient(afterRow);
      await recordAudit(dbClient, actorUserId, "client.updated", "client", id, before, updated);
      await dbClient.query("COMMIT");
      return updated;
    } catch (error) {
      await dbClient.query("ROLLBACK");
      throw error;
    } finally {
      dbClient.release();
    }
  }

  /**
   * Travellers linked to one client's account — not yet called from the
   * frontend (no client-detail page exists), but part of the approved
   * plan's backend surface. Kept to a smaller, endpoint-local shape rather
   * than the full shared Traveller type, since it doesn't need every
   * client this traveller is also linked to — just their relationship to
   * *this* client.
   */
  async listTravellers(clientId: number): Promise<ClientTravellerRow[]> {
    const result = await this.pool.query<{
      id: number;
      name: string;
      dob: string | null;
      passport_status: string;
      relationship: string | null;
      is_demo: boolean;
    }>(
      `SELECT t.id, t.name, to_char(t.dob, 'YYYY-MM-DD') AS dob,
              t.passport_status, ta.relationship, t.is_demo
       FROM travellers t
       JOIN traveller_accounts ta ON ta.traveller_id = t.id
       JOIN clients c ON c.id = ta.client_id
       WHERE ta.client_id = $1
         AND (NOT c.is_demo OR COALESCE((SELECT demo_data_enabled FROM system_settings WHERE id = 1), false))
         AND (NOT t.is_demo OR COALESCE((SELECT demo_data_enabled FROM system_settings WHERE id = 1), false))
       ORDER BY t.name ASC`,
      [clientId],
    );
    return result.rows.map((r) => ({
      id: r.id,
      name: r.name,
      dob: r.dob,
      passportStatus: r.passport_status,
      relationship: r.relationship,
      isDemo: r.is_demo,
    }));
  }

  /**
   * Links an existing traveller to this client. ON CONFLICT DO NOTHING
   * makes re-linking the same pair a harmless no-op rather than a 500 from
   * the composite primary key — the caller doesn't need to check first.
   */
  async linkTraveller(clientId: number, travellerId: number, relationship: string | null): Promise<void> {
    const demoCheck = await this.pool.query<{ client_is_demo: boolean; traveller_is_demo: boolean }>(
      `SELECT c.is_demo AS client_is_demo, t.is_demo AS traveller_is_demo
       FROM clients c CROSS JOIN travellers t
       WHERE c.id = $1 AND t.id = $2`,
      [clientId, travellerId],
    );
    const target = demoCheck.rows[0];
    if (target?.client_is_demo || target?.traveller_is_demo) {
      throw new BadRequestException("Demo clients and travellers are read-only");
    }
    await this.pool.query(
      `INSERT INTO traveller_accounts (client_id, traveller_id, relationship)
       VALUES ($1, $2, $3)
       ON CONFLICT (client_id, traveller_id) DO UPDATE SET relationship = EXCLUDED.relationship`,
      [clientId, travellerId, relationship],
    );
  }
}

function normalizePhoneNumber(value: string | null | undefined): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  return digits ? `+${digits}` : null;
}

function phoneDigits(value: string): string {
  return value.replace(/\D/g, "");
}

async function assertUniqueClientPhone(
  dbClient: PoolClient,
  phoneNumber: string | null,
  excludeClientId?: number,
): Promise<void> {
  if (!phoneNumber) return;
  const existing = await findClientByPhone(dbClient, phoneNumber, excludeClientId);
  if (existing) {
    throw new ConflictException(
      `This phone number is already linked to ${existing.name} (client #${existing.id})`,
    );
  }
}

async function findClientByPhone(
  dbClient: PoolClient,
  phoneNumber: string,
  excludeClientId?: number,
): Promise<{ id: number; name: string } | null> {
  const digits = phoneDigits(phoneNumber);
  await dbClient.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`client-phone:${digits}`]);
  const duplicate = await dbClient.query<{ id: number; name: string }>(
    `SELECT id, name
     FROM clients
     WHERE NOT is_demo
       AND regexp_replace(COALESCE(phone_number, ''), '[^0-9]', '', 'g') = $1
       AND ($2::int IS NULL OR id <> $2)
     ORDER BY created_at, id
     LIMIT 1`,
    [digits, excludeClientId ?? null],
  );
  return duplicate.rows[0] ?? null;
}

async function loadClientById(
  db: Pick<Pool, "query"> | Pick<PoolClient, "query">,
  id: number,
): Promise<Client> {
  const result = await db.query<ClientRow>(`${SELECT_CLIENT} WHERE c.id = $1`, [id]);
  const row = result.rows[0];
  if (!row) throw new NotFoundException("Client not found");
  return toClient(row);
}

function isClientPhoneConstraintError(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "23505" &&
      "constraint" in error &&
      error.constraint === "clients_phone_digits_unique",
  );
}
