import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
} from "@nestjs/common";
import type { Pool, PoolClient } from "pg";
import { recordAudit } from "../../database/audit";
import { PG_POOL } from "../../database/database.module";
import { MESSAGING_CHANNEL, type MessagingChannel } from "./messaging-channel.interface";

export type GroupParticipantInput = { id: number; phoneNumber: string };
export type CreateWhatsAppGroupInput = {
  accountId: number;
  clientId: number;
  travelRequestId: number;
  name: string;
  travellers: GroupParticipantInput[];
  staff: GroupParticipantInput[];
};

export type WhatsAppGroupOptions = {
  clients: Array<{ id: number; name: string }>;
  requests: Array<{
    id: number;
    requestNumber: string;
    clientId: number;
    tripSummary: string;
  }>;
  travellers: Array<{ id: number; name: string; clientIds: number[] }>;
  staff: Array<{ id: number; name: string; roles: string[]; phoneNumber: string | null }>;
};

export type WhatsAppGroupRecord = {
  id: number;
  accountId: number;
  accountLabel: string;
  clientId: number;
  clientName: string;
  travelRequestId: number;
  requestNumber: string;
  tripSummary: string;
  conversationId: number | null;
  whatsappGroupId: string | null;
  name: string;
  status: "creating" | "active" | "failed";
  failureReason: string | null;
  createdByName: string;
  createdAt: string;
  participants: Array<{
    type: "traveller" | "staff";
    entityId: number;
    displayName: string;
    phoneNumber: string;
  }>;
};

type GroupRow = {
  id: number;
  whatsapp_connection_id: number;
  account_label: string;
  client_id: number;
  client_name: string;
  travel_request_id: number;
  request_number: string;
  trip_summary: string;
  conversation_id: number | null;
  whatsapp_group_jid: string | null;
  name: string;
  status: "creating" | "active" | "failed";
  failure_reason: string | null;
  created_by_name: string;
  created_at: string;
  participants: WhatsAppGroupRecord["participants"];
};

const SELECT_GROUPS = `
  SELECT g.id, g.whatsapp_connection_id, wc.label AS account_label, g.client_id, c.name AS client_name,
         g.travel_request_id, r.request_number, r.trip_summary,
         g.conversation_id, g.whatsapp_group_jid, g.name, g.status,
         g.failure_reason, u.name AS created_by_name, g.created_at,
         COALESCE(
           json_agg(
             json_build_object(
               'type', p.participant_type,
               'entityId', COALESCE(p.traveller_id, p.user_id),
               'displayName', p.display_name,
               'phoneNumber', p.phone_number
             ) ORDER BY p.id
           ) FILTER (WHERE p.id IS NOT NULL),
           '[]'
         ) AS participants
  FROM whatsapp_groups g
  JOIN whatsapp_connections wc ON wc.id = g.whatsapp_connection_id
  JOIN clients c ON c.id = g.client_id
  JOIN travel_requests r ON r.id = g.travel_request_id
  JOIN users u ON u.id = g.created_by
  LEFT JOIN whatsapp_group_participants p ON p.whatsapp_group_id = g.id
`;

function toGroup(row: GroupRow): WhatsAppGroupRecord {
  return {
    id: row.id,
    accountId: row.whatsapp_connection_id,
    accountLabel: row.account_label,
    clientId: row.client_id,
    clientName: row.client_name,
    travelRequestId: row.travel_request_id,
    requestNumber: row.request_number,
    tripSummary: row.trip_summary,
    conversationId: row.conversation_id,
    whatsappGroupId: row.whatsapp_group_jid,
    name: row.name,
    status: row.status,
    failureReason: row.failure_reason,
    createdByName: row.created_by_name,
    createdAt: row.created_at,
    participants: row.participants,
  };
}

function normalizePhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) {
    throw new BadRequestException(`Invalid WhatsApp phone number: ${value}`);
  }
  return digits;
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}

async function loadAuditState(client: PoolClient, groupId: number): Promise<Record<string, unknown>> {
  const result = await client.query(
    `SELECT id, whatsapp_connection_id, client_id, travel_request_id, conversation_id, whatsapp_group_jid,
            name, status, failure_reason, created_by, created_at, updated_at
     FROM whatsapp_groups WHERE id = $1`,
    [groupId],
  );
  return result.rows[0] ?? {};
}

@Injectable()
export class WhatsAppGroupsService {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    @Inject(MESSAGING_CHANNEL) private readonly channel: MessagingChannel,
  ) {}

  async getOptions(): Promise<WhatsAppGroupOptions> {
    const [clients, requests, travellers, staff] = await Promise.all([
      this.pool.query<{ id: number; name: string }>("SELECT id, name FROM clients WHERE is_demo = false ORDER BY name"),
      this.pool.query<{
        id: number;
        request_number: string;
        client_id: number;
        trip_summary: string;
      }>(
        `SELECT r.id, r.request_number, r.client_id, r.trip_summary
         FROM travel_requests r
         JOIN clients c ON c.id = r.client_id
         WHERE c.is_demo = false
         ORDER BY r.created_at DESC, r.id DESC`,
      ),
      this.pool.query<{ id: number; name: string; client_ids: number[] }>(
        `SELECT t.id, t.name,
                COALESCE(array_agg(ta.client_id ORDER BY ta.client_id)
                  FILTER (WHERE ta.client_id IS NOT NULL), '{}') AS client_ids
         FROM travellers t
         LEFT JOIN traveller_accounts ta ON ta.traveller_id = t.id
         WHERE t.is_demo = false
         GROUP BY t.id ORDER BY t.name`,
      ),
      this.pool.query<{ id: number; name: string; roles: string[]; phone_number: string | null }>(
        "SELECT id, name, roles, phone_number FROM users WHERE active = true ORDER BY name",
      ),
    ]);
    return {
      clients: clients.rows,
      requests: requests.rows.map((row) => ({
        id: row.id,
        requestNumber: row.request_number,
        clientId: row.client_id,
        tripSummary: row.trip_summary,
      })),
      travellers: travellers.rows.map((row) => ({
        id: row.id,
        name: row.name,
        clientIds: row.client_ids,
      })),
      staff: staff.rows.map((row) => ({
        id: row.id,
        name: row.name,
        roles: row.roles,
        phoneNumber: row.phone_number,
      })),
    };
  }

  async list(): Promise<WhatsAppGroupRecord[]> {
    const result = await this.pool.query<GroupRow>(
      `${SELECT_GROUPS} GROUP BY g.id, wc.id, c.name, r.request_number, r.trip_summary, u.name
       ORDER BY g.created_at DESC, g.id DESC`,
    );
    return result.rows.map(toGroup);
  }

  async create(input: CreateWhatsAppGroupInput, actorUserId: number): Promise<WhatsAppGroupRecord> {
    const client = await this.pool.connect();
    let groupId: number;
    let participants: Array<{
      type: "traveller" | "staff";
      entityId: number;
      displayName: string;
      phoneNumber: string;
    }> = [];

    try {
      await client.query("BEGIN");
      const requestResult = await client.query(
        `SELECT r.id FROM travel_requests r
         WHERE r.id = $1 AND r.client_id = $2 FOR UPDATE`,
        [input.travelRequestId, input.clientId],
      );
      if ((requestResult.rowCount ?? 0) === 0) {
        throw new BadRequestException("The selected request does not belong to the selected client");
      }

      const travellerIds = input.travellers.map((item) => item.id);
      const staffIds = input.staff.map((item) => item.id);
      const [travellerRows, staffRows] = await Promise.all([
        travellerIds.length === 0
          ? Promise.resolve({ rows: [] as Array<{ id: number; name: string }> })
          : client.query<{ id: number; name: string }>(
              `SELECT t.id, t.name FROM travellers t
               JOIN traveller_accounts ta ON ta.traveller_id = t.id
               JOIN clients c ON c.id = ta.client_id
               WHERE ta.client_id = $1 AND t.id = ANY($2::int[])
                 AND t.is_demo = false AND c.is_demo = false`,
              [input.clientId, travellerIds],
            ),
        staffIds.length === 0
          ? Promise.resolve({ rows: [] as Array<{ id: number; name: string; phone_number: string | null }> })
          : client.query<{ id: number; name: string; phone_number: string | null }>(
              "SELECT id, name, phone_number FROM users WHERE id = ANY($1::int[]) AND active = true",
              [staffIds],
            ),
      ]);
      if (travellerRows.rows.length !== travellerIds.length) {
        throw new BadRequestException("Every selected traveller must be linked to the selected client");
      }
      if (staffRows.rows.length !== staffIds.length) {
        throw new BadRequestException("One or more selected staff participants no longer exist");
      }
      if (staffRows.rows.some((row) => !row.phone_number)) {
        throw new BadRequestException("Every selected staff participant must have a registered WhatsApp phone number");
      }

      const travellerNames = new Map(travellerRows.rows.map((row) => [row.id, row.name]));
      const staffNames = new Map(staffRows.rows.map((row) => [row.id, row.name]));
      const staffPhoneNumbers = new Map(staffRows.rows.map((row) => [row.id, row.phone_number as string]));
      participants = [
        ...input.travellers.map((item) => ({
          type: "traveller" as const,
          entityId: item.id,
          displayName: travellerNames.get(item.id) as string,
          phoneNumber: normalizePhone(item.phoneNumber),
        })),
        ...input.staff.map((item) => ({
          type: "staff" as const,
          entityId: item.id,
          displayName: staffNames.get(item.id) as string,
          phoneNumber: normalizePhone(staffPhoneNumbers.get(item.id) as string),
        })),
      ];
      if (participants.length === 0) {
        throw new BadRequestException("Select at least one traveller or staff participant");
      }
      if (new Set(participants.map((item) => item.phoneNumber)).size !== participants.length) {
        throw new BadRequestException("Each participant must have a different WhatsApp phone number");
      }

      if (this.channel.getStatus(input.accountId) !== "connected") {
        throw new BadRequestException("The selected WhatsApp account is not connected");
      }
      const connectedPhone = this.channel.getPhoneNumber(input.accountId)?.replace(/\D/g, "") ?? null;
      if (connectedPhone && participants.some((item) => item.phoneNumber === connectedPhone)) {
        throw new BadRequestException(
          "Do not add the connected YB Travel number as a participant; WhatsApp includes it automatically",
        );
      }

      const existing = await client.query<{ id: number; status: string; name: string }>(
        "SELECT id, status, name FROM whatsapp_groups WHERE travel_request_id = $1 FOR UPDATE",
        [input.travelRequestId],
      );
      const existingRow = existing.rows[0];
      if (existingRow && existingRow.status !== "failed") {
        throw new ConflictException("This travel request already has a managed WhatsApp group");
      }
      if (existingRow && existingRow.name !== input.name) {
        throw new ConflictException(
          `Retry the failed group with its reserved name: ${existingRow.name}`,
        );
      }

      const beforeState = existingRow ? await loadAuditState(client, existingRow.id) : null;
      if (existingRow) {
        groupId = existingRow.id;
        await client.query(
          `UPDATE whatsapp_groups
           SET name = $2, whatsapp_connection_id = $3, status = 'creating', failure_reason = NULL, updated_at = now()
           WHERE id = $1`,
          [groupId, input.name, input.accountId],
        );
      } else {
        const inserted = await client.query<{ id: number }>(
          `INSERT INTO whatsapp_groups
             (whatsapp_connection_id, client_id, travel_request_id, name, status, created_by)
           VALUES ($1, $2, $3, $4, 'creating', $5) RETURNING id`,
          [input.accountId, input.clientId, input.travelRequestId, input.name, actorUserId],
        );
        groupId = inserted.rows[0]?.id as number;
      }
      const reservedState = await loadAuditState(client, groupId);
      await recordAudit(
        client,
        actorUserId,
        "whatsapp_group.creation_started",
        "whatsapp_group",
        groupId,
        beforeState,
        reservedState,
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      client.release();
      if (isUniqueViolation(error)) {
        throw new ConflictException("This request or group name already has a managed WhatsApp group");
      }
      throw error;
    }
    client.release();

    try {
      const created = await this.channel.createGroup(
        input.accountId,
        input.name,
        participants.map((item) => item.phoneNumber),
      );
      const finalClient = await this.pool.connect();
      try {
        await finalClient.query("BEGIN");
        const beforeState = await loadAuditState(finalClient, groupId);
        const conversation = await finalClient.query<{ id: number }>(
          `INSERT INTO conversations (whatsapp_connection_id, whatsapp_jid, phone_number, display_name)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (whatsapp_connection_id, whatsapp_jid) DO UPDATE SET display_name = EXCLUDED.display_name
           RETURNING id`,
          [input.accountId, created.jid, created.jid.split("@")[0] ?? created.jid, created.name],
        );
        const conversationId = conversation.rows[0]?.id;
        if (!conversationId) throw new Error("Failed to link WhatsApp conversation");
        await finalClient.query(
          `UPDATE whatsapp_groups
           SET conversation_id = $2, whatsapp_group_jid = $3, name = $4,
               status = 'active', failure_reason = NULL, updated_at = now()
           WHERE id = $1`,
          [groupId, conversationId, created.jid, created.name],
        );
        await finalClient.query("DELETE FROM whatsapp_group_participants WHERE whatsapp_group_id = $1", [
          groupId,
        ]);
        for (const participant of participants) {
          await finalClient.query(
            `INSERT INTO whatsapp_group_participants
               (whatsapp_group_id, participant_type, traveller_id, user_id,
                display_name, phone_number)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              groupId,
              participant.type,
              participant.type === "traveller" ? participant.entityId : null,
              participant.type === "staff" ? participant.entityId : null,
              participant.displayName,
              participant.phoneNumber,
            ],
          );
        }
        const afterState = await loadAuditState(finalClient, groupId);
        await recordAudit(
          finalClient,
          actorUserId,
          created.reusedExisting ? "whatsapp_group.reconciled" : "whatsapp_group.created",
          "whatsapp_group",
          groupId,
          beforeState,
          { ...afterState, participants },
        );
        await finalClient.query("COMMIT");
      } catch (error) {
        await finalClient.query("ROLLBACK");
        throw error;
      } finally {
        finalClient.release();
      }
    } catch (error) {
      const failureReason = error instanceof Error ? error.message.slice(0, 500) : "WhatsApp group creation failed";
      const failedClient = await this.pool.connect();
      try {
        await failedClient.query("BEGIN");
        const beforeState = await loadAuditState(failedClient, groupId);
        await failedClient.query(
          `UPDATE whatsapp_groups
           SET status = 'failed', failure_reason = $2, updated_at = now() WHERE id = $1`,
          [groupId, failureReason],
        );
        const afterState = await loadAuditState(failedClient, groupId);
        await recordAudit(
          failedClient,
          actorUserId,
          "whatsapp_group.failed",
          "whatsapp_group",
          groupId,
          beforeState,
          afterState,
        );
        await failedClient.query("COMMIT");
      } catch (auditError) {
        await failedClient.query("ROLLBACK");
        throw auditError;
      } finally {
        failedClient.release();
      }
      throw new BadGatewayException(failureReason);
    }

    const result = await this.pool.query<GroupRow>(
      `${SELECT_GROUPS} WHERE g.id = $1
       GROUP BY g.id, wc.id, c.name, r.request_number, r.trip_summary, u.name`,
      [groupId],
    );
    const row = result.rows[0];
    if (!row) throw new Error("Failed to load created WhatsApp group");
    return toGroup(row);
  }
}
