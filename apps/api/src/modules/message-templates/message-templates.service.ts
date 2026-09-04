import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { Pool } from "pg";
import { recordAudit } from "../../database/audit";
import { PG_POOL } from "../../database/database.module";
import { OnboardingService } from "../clients/onboarding.service";

export type MessageTemplate = {
  id: number;
  code: string;
  name: string;
  purpose: string;
  languageCode: string;
  languageName: string;
  messageBody: string;
  active: boolean;
  isStarter: boolean;
  createdAt: string;
  updatedAt: string;
};

export type MessageTemplateInput = Omit<
  MessageTemplate,
  "id" | "isStarter" | "createdAt" | "updatedAt"
>;

type MessageTemplateRow = {
  id: number;
  code: string;
  name: string;
  purpose: string;
  language_code: string;
  language_name: string;
  message_body: string;
  active: boolean;
  is_starter: boolean;
  created_at: string;
  updated_at: string;
};

const SELECT_TEMPLATE = `
  SELECT id, code, name, purpose, language_code, language_name,
         message_body, active, is_starter, created_at, updated_at
  FROM message_templates
`;

function toMessageTemplate(row: MessageTemplateRow): MessageTemplate {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    purpose: row.purpose,
    languageCode: row.language_code,
    languageName: row.language_name,
    messageBody: row.message_body,
    active: row.active,
    isStarter: row.is_starter,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}

@Injectable()
export class MessageTemplatesService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool, private readonly onboarding: OnboardingService) {}

  private validateVariables(body: string) {
    const allowed = new Set(["client_name", "request_number", "missing_items", "fee_amount", "currency"]);
    const variables = [...body.matchAll(/{{\s*([a-z_]+)\s*}}/g)].map((match) => match[1]!);
    const unknown = [...new Set(variables.filter((name) => !allowed.has(name)))];
    if (unknown.length) throw new BadRequestException(`Unsupported template variables: ${unknown.join(", ")}`);
  }

  async list(activeOnly: boolean): Promise<MessageTemplate[]> {
    const where = activeOnly ? "WHERE active = true" : "";
    const result = await this.pool.query<MessageTemplateRow>(
      `${SELECT_TEMPLATE} ${where} ORDER BY purpose ASC, language_name ASC, name ASC`,
    );
    return result.rows.map(toMessageTemplate);
  }

  async create(input: MessageTemplateInput, actorUserId: number): Promise<MessageTemplate> {
    this.validateVariables(input.messageBody);
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query<MessageTemplateRow>(
        `INSERT INTO message_templates
           (code, name, purpose, language_code, language_name, message_body,
            active, is_starter, created_by, updated_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, false, $8, $8)
         RETURNING id, code, name, purpose, language_code, language_name,
                   message_body, active, is_starter, created_at, updated_at`,
        [
          input.code,
          input.name,
          input.purpose,
          input.languageCode,
          input.languageName,
          input.messageBody,
          input.active,
          actorUserId,
        ],
      );
      const row = result.rows[0];
      if (!row) throw new Error("Failed to create message template");
      const created = toMessageTemplate(row);
      await recordAudit(client, actorUserId, "message_template.created", "message_template", created.id, null, created);
      await client.query("COMMIT");
      return created;
    } catch (error) {
      await client.query("ROLLBACK");
      if (isUniqueViolation(error)) throw new ConflictException("A message template with this code already exists");
      throw error;
    } finally {
      client.release();
    }
  }

  async update(id: number, input: MessageTemplateInput, actorUserId: number): Promise<MessageTemplate> {
    this.validateVariables(input.messageBody);
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const existingResult = await client.query<MessageTemplateRow>(
        `${SELECT_TEMPLATE} WHERE id = $1 FOR UPDATE`,
        [id],
      );
      const existingRow = existingResult.rows[0];
      if (!existingRow) throw new NotFoundException("Message template not found");

      const result = await client.query<MessageTemplateRow>(
        `UPDATE message_templates
         SET code = $2,
             name = $3,
             purpose = $4,
             language_code = $5,
             language_name = $6,
             message_body = $7,
             active = $8,
             updated_by = $9,
             updated_at = now()
         WHERE id = $1
         RETURNING id, code, name, purpose, language_code, language_name,
                   message_body, active, is_starter, created_at, updated_at`,
        [
          id,
          input.code,
          input.name,
          input.purpose,
          input.languageCode,
          input.languageName,
          input.messageBody,
          input.active,
          actorUserId,
        ],
      );
      const row = result.rows[0];
      if (!row) throw new NotFoundException("Message template not found");
      const updated = toMessageTemplate(row);
      await recordAudit(
        client,
        actorUserId,
        "message_template.updated",
        "message_template",
        updated.id,
        toMessageTemplate(existingRow),
        updated,
      );
      await client.query("COMMIT");
      return updated;
    } catch (error) {
      await client.query("ROLLBACK");
      if (isUniqueViolation(error)) throw new ConflictException("A message template with this code already exists");
      throw error;
    } finally {
      client.release();
    }
  }

  async render(id: number, conversationId: number) {
    const templateResult = await this.pool.query<MessageTemplateRow>(`${SELECT_TEMPLATE} WHERE id = $1 AND active = true`, [id]);
    const template = templateResult.rows[0];
    if (!template) throw new NotFoundException("Active message template not found");
    const contextResult = await this.pool.query<{
      client_name: string | null; request_id: number | null; request_number: string | null;
      fee_amount: string | null; currency: string | null;
    }>(
      `SELECT client.name AS client_name, request.id AS request_id, request.request_number,
              quote.total_amount::text AS fee_amount, quote.currency
       FROM conversations conversation
       LEFT JOIN whatsapp_groups managed_group ON managed_group.conversation_id = conversation.id
       LEFT JOIN clients client ON client.id = COALESCE(conversation.client_id, managed_group.client_id)
       LEFT JOIN LATERAL (
         SELECT r.id, r.request_number FROM travel_requests r
         LEFT JOIN ai_draft_intakes d ON d.id = r.source_draft_intake_id
         WHERE r.id = managed_group.travel_request_id OR d.conversation_id = conversation.id
         ORDER BY (r.id = managed_group.travel_request_id) DESC, r.created_at DESC LIMIT 1
       ) request ON true
       LEFT JOIN LATERAL (
         SELECT q.total_amount, q.currency FROM request_booking_fee_quotes q
         WHERE q.travel_request_id = request.id ORDER BY q.calculated_at DESC, q.id DESC LIMIT 1
       ) quote ON true
       WHERE conversation.id = $1`, [conversationId]);
    const context = contextResult.rows[0];
    if (!context) throw new NotFoundException("Conversation not found");
    let missingItems: string | null = null;
    if (context.request_id) {
      const status = await this.onboarding.getRequestStatus(context.request_id);
      missingItems = status.missingItems.join(", ") || null;
    }
    const values: Record<string, string | null> = {
      client_name: context.client_name,
      request_number: context.request_number,
      missing_items: missingItems,
      fee_amount: context.fee_amount,
      currency: context.currency,
    };
    const used = [...template.message_body.matchAll(/{{\s*([a-z_]+)\s*}}/g)].map((match) => match[1]!);
    const missingVariables = [...new Set(used.filter((name) => !values[name]))];
    const renderedText = template.message_body.replace(/{{\s*([a-z_]+)\s*}}/g, (token, name: string) => values[name] ?? token);
    return { template: toMessageTemplate(template), renderedText, missingVariables };
  }
}
