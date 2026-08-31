import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { Pool } from "pg";
import { recordAudit } from "../../database/audit";
import { PG_POOL } from "../../database/database.module";

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
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async list(activeOnly: boolean): Promise<MessageTemplate[]> {
    const where = activeOnly ? "WHERE active = true" : "";
    const result = await this.pool.query<MessageTemplateRow>(
      `${SELECT_TEMPLATE} ${where} ORDER BY purpose ASC, language_name ASC, name ASC`,
    );
    return result.rows.map(toMessageTemplate);
  }

  async create(input: MessageTemplateInput, actorUserId: number): Promise<MessageTemplate> {
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
}
