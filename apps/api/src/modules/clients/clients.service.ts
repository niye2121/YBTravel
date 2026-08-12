import { Inject, Injectable } from "@nestjs/common";
import type { Pool } from "pg";
import type { Client, CreateClientInput, FeeGroup, OnboardingStage } from "@yb-travel/shared";
import { PG_POOL } from "../../database/database.module";

type ClientRow = {
  id: number;
  name: string;
  preferred_rep_id: number | null;
  preferred_rep_name: string | null;
  secondary_rep_id: number | null;
  secondary_rep_name: string | null;
  fee_group: string;
  stage: string;
  created_at: string;
};

function toClient(row: ClientRow): Client {
  return {
    id: row.id,
    name: row.name,
    preferredRepId: row.preferred_rep_id,
    preferredRepName: row.preferred_rep_name,
    secondaryRepId: row.secondary_rep_id,
    secondaryRepName: row.secondary_rep_name,
    feeGroup: row.fee_group as FeeGroup,
    stage: row.stage as OnboardingStage,
    createdAt: row.created_at,
  };
}

const SELECT_CLIENT = `
  SELECT c.id, c.name, c.fee_group, c.stage, c.created_at,
         c.preferred_rep_id, pu.name AS preferred_rep_name,
         c.secondary_rep_id, su.name AS secondary_rep_name
  FROM clients c
  LEFT JOIN users pu ON pu.id = c.preferred_rep_id
  LEFT JOIN users su ON su.id = c.secondary_rep_id
`;

export type ClientTravellerRow = {
  id: number;
  name: string;
  dob: string | null;
  passportStatus: string;
  relationship: string | null;
};

@Injectable()
export class ClientsService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async list(): Promise<Client[]> {
    const result = await this.pool.query<ClientRow>(`${SELECT_CLIENT} ORDER BY c.name ASC`);
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

  async create(input: CreateClientInput): Promise<Client> {
    const inserted = await this.pool.query<{ id: number }>(
      `INSERT INTO clients (name, preferred_rep_id, secondary_rep_id, fee_group)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [input.name, input.preferredRepId ?? null, input.secondaryRepId ?? null, input.feeGroup],
    );
    const id = inserted.rows[0]?.id;
    if (!id) throw new Error("Failed to create client");

    const result = await this.pool.query<ClientRow>(`${SELECT_CLIENT} WHERE c.id = $1`, [id]);
    const row = result.rows[0];
    if (!row) throw new Error("Failed to load created client");
    return toClient(row);
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
    }>(
      `SELECT t.id, t.name, t.dob, t.passport_status, ta.relationship
       FROM travellers t
       JOIN traveller_accounts ta ON ta.traveller_id = t.id
       WHERE ta.client_id = $1
       ORDER BY t.name ASC`,
      [clientId],
    );
    return result.rows.map((r) => ({
      id: r.id,
      name: r.name,
      dob: r.dob,
      passportStatus: r.passport_status,
      relationship: r.relationship,
    }));
  }

  /**
   * Links an existing traveller to this client. ON CONFLICT DO NOTHING
   * makes re-linking the same pair a harmless no-op rather than a 500 from
   * the composite primary key — the caller doesn't need to check first.
   */
  async linkTraveller(clientId: number, travellerId: number, relationship: string | null): Promise<void> {
    await this.pool.query(
      `INSERT INTO traveller_accounts (client_id, traveller_id, relationship)
       VALUES ($1, $2, $3)
       ON CONFLICT (client_id, traveller_id) DO UPDATE SET relationship = EXCLUDED.relationship`,
      [clientId, travellerId, relationship],
    );
  }
}
