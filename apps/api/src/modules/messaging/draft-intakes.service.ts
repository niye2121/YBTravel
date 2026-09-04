import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { Pool, PoolClient } from "pg";
import { z } from "zod";
import { recordAudit } from "../../database/audit";
import { PG_POOL } from "../../database/database.module";
import { OpenAiClientService } from "../ai-provider-settings/openai-client.service";
import { RequestsService } from "../requests/requests.service";
import { MessagingGateway } from "./messaging.gateway";

export type DraftIntakeStatus = "pending" | "rejected" | "approved" | "failed";

export type DraftIntakeRecord = {
  id: number;
  conversationId: number;
  sourceMessageId: number;
  status: DraftIntakeStatus;
  requestTypeId: number | null;
  requestTypeCode: string | null;
  requestTypeName: string | null;
  urgencyLevelId: number | null;
  urgencyCode: string | null;
  urgencyName: string | null;
  summary: string;
  passengerCount: number | null;
  origin: string | null;
  destination: string | null;
  departureDateText: string | null;
  returnDateText: string | null;
  missingInformation: string[];
  suggestedReply: string | null;
  confidence: number | null;
  analysisError: string | null;
  travelRequestId: number | null;
  travelRequestNumber: string | null;
  reviewedByName: string | null;
  createdAt: string;
  updatedAt: string;
};

export type UpdateDraftIntakeInput = {
  requestTypeId: number;
  urgencyLevelId: number;
  summary: string;
  passengerCount: number | null;
  origin: string | null;
  destination: string | null;
  departureDateText: string | null;
  returnDateText: string | null;
  missingInformation: string[];
  suggestedReply: string | null;
};

type DraftRow = {
  id: number;
  conversation_id: number;
  source_message_id: number;
  status: DraftIntakeStatus;
  request_type_id: number | null;
  request_type_code: string | null;
  request_type_name: string | null;
  urgency_level_id: number | null;
  urgency_code: string | null;
  urgency_name: string | null;
  summary: string;
  passenger_count: number | null;
  origin: string | null;
  destination: string | null;
  departure_date_text: string | null;
  return_date_text: string | null;
  missing_information: unknown;
  suggested_reply: string | null;
  confidence: number | null;
  analysis_error: string | null;
  travel_request_id: number | null;
  travel_request_number: string | null;
  reviewed_by_name: string | null;
  created_at: string;
  updated_at: string;
};

type CatalogueItem = { id: number; code: string; name: string };

const aiResultSchema = z.object({
  isRequest: z.boolean(),
  requestTypeCode: z.string(),
  urgencyCode: z.string(),
  summary: z.string().trim().max(200),
  passengerCount: z.number().int().min(1).max(100).nullable(),
  origin: z.string().trim().max(100).nullable(),
  destination: z.string().trim().max(100).nullable(),
  departureDateText: z.string().trim().max(100).nullable(),
  returnDateText: z.string().trim().max(100).nullable(),
  missingInformation: z.array(z.string().trim().min(1).max(200)).max(20),
  suggestedReply: z.string().trim().max(2000).nullable(),
  confidence: z.number().int().min(0).max(100),
});

const SELECT_DRAFTS = `
  SELECT d.id, d.conversation_id, d.source_message_id, d.status,
         d.request_type_id, rt.code AS request_type_code, rt.name AS request_type_name,
         d.urgency_level_id, ul.code AS urgency_code, ul.name AS urgency_name,
         d.summary, d.passenger_count, d.origin, d.destination,
         d.departure_date_text, d.return_date_text, d.missing_information,
         d.suggested_reply, d.confidence, d.analysis_error,
         d.travel_request_id, tr.request_number AS travel_request_number,
         u.name AS reviewed_by_name, d.created_at, d.updated_at
  FROM ai_draft_intakes d
  LEFT JOIN request_types rt ON rt.id = d.request_type_id
  LEFT JOIN urgency_levels ul ON ul.id = d.urgency_level_id
  LEFT JOIN travel_requests tr ON tr.id = d.travel_request_id
  LEFT JOIN users u ON u.id = d.reviewed_by
`;

function toDraft(row: DraftRow): DraftIntakeRecord {
  const missing = Array.isArray(row.missing_information)
    ? row.missing_information.filter((item): item is string => typeof item === "string")
    : [];
  return {
    id: row.id,
    conversationId: row.conversation_id,
    sourceMessageId: row.source_message_id,
    status: row.status,
    requestTypeId: row.request_type_id,
    requestTypeCode: row.request_type_code,
    requestTypeName: row.request_type_name,
    urgencyLevelId: row.urgency_level_id,
    urgencyCode: row.urgency_code,
    urgencyName: row.urgency_name,
    summary: row.summary,
    passengerCount: row.passenger_count,
    origin: row.origin,
    destination: row.destination,
    departureDateText: row.departure_date_text,
    returnDateText: row.return_date_text,
    missingInformation: missing,
    suggestedReply: row.suggested_reply,
    confidence: row.confidence,
    analysisError: row.analysis_error,
    travelRequestId: row.travel_request_id,
    travelRequestNumber: row.travel_request_number,
    reviewedByName: row.reviewed_by_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function cleanNullable(value: string | null): string | null {
  const next = value?.trim() ?? "";
  return next ? next : null;
}

function redactSensitiveData(value: string): string {
  return value
    .replace(/\b(?:\d[ -]*?){13,19}\b/g, "[PAYMENT CARD REDACTED]")
    .replace(/\b(cvv|cvc|security code)\s*[:#-]?\s*\d{3,4}\b/gi, "$1 [REDACTED]")
    .replace(/\b(passport(?: number| no\.?| #)?)\s*[:#-]?\s*[a-z0-9]{5,20}\b/gi, "$1 [REDACTED]");
}

function isLikelyTravelRequest(value: string): boolean {
  const text = value.trim().toLowerCase();
  if (text.length < 8) return false;
  if (/^(hi|hello|hey|thanks|thank you|ok|okay|good morning|good afternoon)[!. ]*$/i.test(text)) return false;
  return /(flight|travel|trip|book|booking|ticket|change|cancel|refund|airport|passenger|passport|visa|hotel|depart|return|from\s+.+\s+to\s+|\b[a-z]{3}\b.*\b[a-z]{3}\b)/i.test(text);
}

@Injectable()
export class DraftIntakesService {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly openAi: OpenAiClientService,
    private readonly requests: RequestsService,
    private readonly gateway: MessagingGateway,
  ) {}

  async list(conversationId: number): Promise<DraftIntakeRecord[]> {
    const result = await this.pool.query<DraftRow>(
      `${SELECT_DRAFTS} WHERE d.conversation_id = $1 ORDER BY d.created_at DESC, d.id DESC`,
      [conversationId],
    );
    return result.rows.map(toDraft);
  }

  async analyzeLatest(conversationId: number, actorUserId: number): Promise<DraftIntakeRecord | null> {
    const result = await this.pool.query<{ id: number }>(
      `SELECT id FROM messages
       WHERE conversation_id = $1 AND direction = 'inbound'
       ORDER BY created_at DESC, id DESC LIMIT 1`,
      [conversationId],
    );
    const messageId = result.rows[0]?.id;
    if (!messageId) throw new BadRequestException("This conversation has no incoming message to analyze");
    return this.analyzeInboundMessage(messageId, actorUserId, true);
  }

  async analyzeInboundMessage(
    messageId: number,
    actorUserId?: number,
    force = false,
  ): Promise<DraftIntakeRecord | null> {
    const messageResult = await this.pool.query<{
      conversation_id: number;
      body: string;
      direction: "inbound" | "outbound";
    }>("SELECT conversation_id, body, direction FROM messages WHERE id = $1", [messageId]);
    const message = messageResult.rows[0];
    if (!message || message.direction !== "inbound") return null;

    const existing = await this.getBySourceMessage(messageId);
    if (existing && existing.status !== "failed") return existing;
    if (!force && !isLikelyTravelRequest(message.body)) return null;

    const [typesResult, urgencyResult] = await Promise.all([
      this.pool.query<CatalogueItem>("SELECT id, code, name FROM request_types WHERE active = true ORDER BY position, id"),
      this.pool.query<CatalogueItem>("SELECT id, code, name FROM urgency_levels WHERE active = true ORDER BY position, id"),
    ]);
    if (!typesResult.rows.length || !urgencyResult.rows.length) {
      throw new BadRequestException("Request workflow needs at least one active type and urgency level");
    }

    const typeCodes = typesResult.rows.map((item) => item.code);
    const urgencyCodes = urgencyResult.rows.map((item) => item.code);
    const conversationId = message.conversation_id;
    try {
      const response = await this.openAi.createTextResponse({
        purpose: "intake_classification",
        input: redactSensitiveData(message.body),
        instructions: [
          "You prepare a draft intake for a human travel employee to review.",
          "Never claim that a booking or request has been created, and never invent missing facts.",
          `Use one request type code from: ${typeCodes.join(", ")}.`,
          `Use one urgency code from: ${urgencyCodes.join(", ")}.`,
          "Set isRequest false for greetings, acknowledgements, spam, or messages with no travel-service intent.",
          "The suggested reply is only a draft. Ask concise questions for important missing details.",
        ].join("\n"),
        initiatedBy: actorUserId,
        relatedEntityType: "conversation",
        relatedEntityId: conversationId,
        responseFormat: {
          name: "yb_travel_draft_intake",
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              isRequest: { type: "boolean" },
              requestTypeCode: { type: "string", enum: typeCodes },
              urgencyCode: { type: "string", enum: urgencyCodes },
              summary: { type: "string", maxLength: 200 },
              passengerCount: { type: ["integer", "null"], minimum: 1, maximum: 100 },
              origin: { type: ["string", "null"], maxLength: 100 },
              destination: { type: ["string", "null"], maxLength: 100 },
              departureDateText: { type: ["string", "null"], maxLength: 100 },
              returnDateText: { type: ["string", "null"], maxLength: 100 },
              missingInformation: { type: "array", maxItems: 20, items: { type: "string", maxLength: 200 } },
              suggestedReply: { type: ["string", "null"], maxLength: 2000 },
              confidence: { type: "integer", minimum: 0, maximum: 100 },
            },
            required: [
              "isRequest", "requestTypeCode", "urgencyCode", "summary", "passengerCount",
              "origin", "destination", "departureDateText", "returnDateText",
              "missingInformation", "suggestedReply", "confidence",
            ],
          },
        },
      });
      const result = aiResultSchema.parse(JSON.parse(response.text));
      if (!result.isRequest) return null;
      const requestType = typesResult.rows.find((item) => item.code === result.requestTypeCode);
      const urgency = urgencyResult.rows.find((item) => item.code === result.urgencyCode);
      if (!requestType || !urgency) throw new Error("AI returned an inactive workflow value");

      if (existing) {
        await this.pool.query(
          `UPDATE ai_draft_intakes SET status = 'pending', request_type_id = $2,
             urgency_level_id = $3, summary = $4, passenger_count = $5, origin = $6,
             destination = $7, departure_date_text = $8, return_date_text = $9,
             missing_information = $10::jsonb, suggested_reply = $11, confidence = $12,
             provider_response_id = $13, analysis_error = NULL, updated_at = now()
           WHERE id = $1`,
          [existing.id, requestType.id, urgency.id, result.summary, result.passengerCount,
           cleanNullable(result.origin), cleanNullable(result.destination), cleanNullable(result.departureDateText),
           cleanNullable(result.returnDateText), JSON.stringify(result.missingInformation),
           cleanNullable(result.suggestedReply), result.confidence, response.responseId],
        );
      } else {
        await this.pool.query(
          `INSERT INTO ai_draft_intakes
             (conversation_id, source_message_id, request_type_id, urgency_level_id,
              summary, passenger_count, origin, destination, departure_date_text,
              return_date_text, missing_information, suggested_reply, confidence, provider_response_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12, $13, $14)
           ON CONFLICT (source_message_id) DO NOTHING`,
          [conversationId, messageId, requestType.id, urgency.id, result.summary,
           result.passengerCount, cleanNullable(result.origin), cleanNullable(result.destination),
           cleanNullable(result.departureDateText), cleanNullable(result.returnDateText),
           JSON.stringify(result.missingInformation), cleanNullable(result.suggestedReply),
           result.confidence, response.responseId],
        );
      }
    } catch (error) {
      const safeError = error instanceof Error ? error.message.slice(0, 500) : "AI analysis failed";
      await this.pool.query(
        `INSERT INTO ai_draft_intakes
           (conversation_id, source_message_id, status, summary, analysis_error)
         VALUES ($1, $2, 'failed', 'AI analysis failed', $3)
         ON CONFLICT (source_message_id) DO UPDATE SET
           status = 'failed', analysis_error = EXCLUDED.analysis_error, updated_at = now()`,
        [conversationId, messageId, safeError],
      );
    }

    this.gateway.emitDraftIntakeUpdated(conversationId);
    return this.getBySourceMessage(messageId);
  }

  async update(id: number, input: UpdateDraftIntakeInput, actorUserId: number): Promise<DraftIntakeRecord> {
    return this.mutatePending(id, actorUserId, async (client, before) => {
      await this.assertActiveWorkflow(client, input.requestTypeId, input.urgencyLevelId);
      await client.query(
        `UPDATE ai_draft_intakes SET request_type_id = $2, urgency_level_id = $3,
           summary = $4, passenger_count = $5, origin = $6, destination = $7,
           departure_date_text = $8, return_date_text = $9,
           missing_information = $10::jsonb, suggested_reply = $11, updated_at = now()
         WHERE id = $1`,
        [id, input.requestTypeId, input.urgencyLevelId, input.summary.trim(), input.passengerCount,
         cleanNullable(input.origin), cleanNullable(input.destination), cleanNullable(input.departureDateText),
         cleanNullable(input.returnDateText), JSON.stringify(input.missingInformation), cleanNullable(input.suggestedReply)],
      );
      const after = await this.loadOne(client, id);
      await recordAudit(client, actorUserId, "ai_draft_intake.updated", "ai_draft_intake", id, before, after);
      return after;
    });
  }

  async reject(id: number, actorUserId: number): Promise<DraftIntakeRecord> {
    return this.mutatePending(id, actorUserId, async (client, before) => {
      await client.query(
        `UPDATE ai_draft_intakes SET status = 'rejected', reviewed_by = $2,
           reviewed_at = now(), updated_at = now() WHERE id = $1`,
        [id, actorUserId],
      );
      const after = await this.loadOne(client, id);
      await recordAudit(client, actorUserId, "ai_draft_intake.rejected", "ai_draft_intake", id, before, after);
      return after;
    });
  }

  async createRequest(id: number, actorUserId: number): Promise<DraftIntakeRecord> {
    const before = await this.getById(id);
    if (!before) throw new NotFoundException("Draft intake not found");
    if (before.status === "approved") return before;
    if (before.status !== "pending") throw new ConflictException("Only a pending draft can create a request");
    if (!before.requestTypeId || !before.urgencyLevelId || !before.summary.trim()) {
      throw new BadRequestException("Complete the request type, urgency, and summary first");
    }
    const conversation = await this.pool.query<{ client_id: number | null }>(
      "SELECT client_id FROM conversations WHERE id = $1",
      [before.conversationId],
    );
    const clientId = conversation.rows[0]?.client_id;
    if (!clientId) throw new BadRequestException("Link this conversation to a client before creating the request");

    let request = await this.pool.query<{ id: number }>(
      "SELECT id FROM travel_requests WHERE source_draft_intake_id = $1",
      [id],
    );
    let requestId = request.rows[0]?.id;
    if (!requestId) {
      const created = await this.requests.create(
        clientId, before.summary.trim(), actorUserId, before.requestTypeId, before.urgencyLevelId, id,
        {
          passengerCount: before.passengerCount,
          origin: before.origin,
          destination: before.destination,
          departureDateText: before.departureDateText,
          returnDateText: before.returnDateText,
        },
      );
      requestId = created.id;
    }

    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `UPDATE ai_draft_intakes SET status = 'approved', travel_request_id = $2,
           reviewed_by = $3, reviewed_at = now(), updated_at = now() WHERE id = $1`,
        [id, requestId, actorUserId],
      );
      const after = await this.loadOne(client, id);
      await recordAudit(client, actorUserId, "ai_draft_intake.approved", "ai_draft_intake", id, before, after);
      await client.query("COMMIT");
      this.gateway.emitDraftIntakeUpdated(before.conversationId);
      return after;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  private async mutatePending(
    id: number,
    actorUserId: number,
    operation: (client: PoolClient, before: DraftIntakeRecord) => Promise<DraftIntakeRecord>,
  ): Promise<DraftIntakeRecord> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const before = await this.loadOne(client, id, true);
      if (before.status !== "pending") throw new ConflictException("Only a pending draft can be changed");
      const result = await operation(client, before);
      await client.query("COMMIT");
      this.gateway.emitDraftIntakeUpdated(before.conversationId);
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  private async assertActiveWorkflow(client: PoolClient, requestTypeId: number, urgencyLevelId: number): Promise<void> {
    const result = await client.query<{ type_ok: boolean; urgency_ok: boolean }>(
      `SELECT EXISTS(SELECT 1 FROM request_types WHERE id = $1 AND active) AS type_ok,
              EXISTS(SELECT 1 FROM urgency_levels WHERE id = $2 AND active) AS urgency_ok`,
      [requestTypeId, urgencyLevelId],
    );
    if (!result.rows[0]?.type_ok) throw new BadRequestException("Select an active request type");
    if (!result.rows[0]?.urgency_ok) throw new BadRequestException("Select an active urgency level");
  }

  private async getBySourceMessage(messageId: number): Promise<DraftIntakeRecord | null> {
    const result = await this.pool.query<DraftRow>(`${SELECT_DRAFTS} WHERE d.source_message_id = $1`, [messageId]);
    return result.rows[0] ? toDraft(result.rows[0]) : null;
  }

  private async getById(id: number): Promise<DraftIntakeRecord | null> {
    const result = await this.pool.query<DraftRow>(`${SELECT_DRAFTS} WHERE d.id = $1`, [id]);
    return result.rows[0] ? toDraft(result.rows[0]) : null;
  }

  private async loadOne(client: PoolClient, id: number, lock = false): Promise<DraftIntakeRecord> {
    const result = await client.query<DraftRow>(
      `${SELECT_DRAFTS} WHERE d.id = $1${lock ? " FOR UPDATE OF d" : ""}`,
      [id],
    );
    if (!result.rows[0]) throw new NotFoundException("Draft intake not found");
    return toDraft(result.rows[0]);
  }
}
