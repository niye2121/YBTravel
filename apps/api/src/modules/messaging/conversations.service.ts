import { Inject, Injectable } from "@nestjs/common";
import type { Pool } from "pg";
import { PG_POOL } from "../../database/database.module";

export type MessageDirection = "inbound" | "outbound";
export type DeliveryStatus = "pending" | "sending" | "sent" | "received" | "failed" | "delivery_unknown";

export type ConversationSummary = {
  id: number; whatsappJid: string; phoneNumber: string; displayName: string | null;
  lastMessageAt: string | null; lastMessageBody: string | null; clientId: number | null; clientName: string | null;
};
export type ConversationRecord = { id: number; whatsappJid: string; phoneNumber: string; displayName: string | null };
export type MessageRecord = {
  id: number; conversationId: number; direction: MessageDirection; body: string; senderJid: string;
  providerMessageId: string | null; deliveryStatus: DeliveryStatus; deliveryAttemptCount: number;
  lastDeliveryError: string | null; createdAt: string;
};
export type RetryableMessage = MessageRecord & { whatsappJid: string };
type MessageRow = {
  id: number; conversation_id: number; direction: MessageDirection; body: string; sender_jid: string;
  provider_message_id: string | null; delivery_status: DeliveryStatus; delivery_attempt_count: number;
  last_delivery_error: string | null; created_at: string;
};

@Injectable()
export class ConversationsService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  private toMessage(row: MessageRow): MessageRecord {
    return { id: row.id, conversationId: row.conversation_id, direction: row.direction, body: row.body,
      senderJid: row.sender_jid, providerMessageId: row.provider_message_id,
      deliveryStatus: row.delivery_status, deliveryAttemptCount: row.delivery_attempt_count,
      lastDeliveryError: row.last_delivery_error, createdAt: row.created_at };
  }

  async findOrCreateConversation(jid: string, phoneNumber: string, displayName: string | null): Promise<number> {
    const result = await this.pool.query<{ id: number }>(
      `INSERT INTO conversations (whatsapp_jid, phone_number, display_name) VALUES ($1, $2, $3)
       ON CONFLICT (whatsapp_jid) DO UPDATE SET phone_number = EXCLUDED.phone_number,
         display_name = COALESCE(EXCLUDED.display_name, conversations.display_name) RETURNING id`,
      [jid, phoneNumber, displayName]);
    const id = result.rows[0]?.id;
    if (!id) throw new Error("Failed to create conversation");
    return id;
  }

  async updateDisplayName(jid: string, displayName: string): Promise<number | null> {
    const result = await this.pool.query<{ id: number }>(
      "UPDATE conversations SET display_name = $2 WHERE whatsapp_jid = $1 AND display_name IS DISTINCT FROM $2 RETURNING id",
      [jid, displayName]);
    return result.rows[0]?.id ?? null;
  }

  async appendInboundMessage(conversationId: number, body: string, senderJid: string, providerMessageId: string): Promise<{ id: number; created: boolean }> {
    const inserted = await this.pool.query<{ id: number }>(
      `INSERT INTO messages (conversation_id, direction, body, sender_jid, provider_message_id, delivery_status)
       VALUES ($1, 'inbound', $2, $3, $4, 'received')
       ON CONFLICT (direction, provider_message_id) WHERE provider_message_id IS NOT NULL DO NOTHING RETURNING id`,
      [conversationId, body, senderJid, providerMessageId]);
    let id = inserted.rows[0]?.id;
    const created = Boolean(id);
    if (!id) {
      const existing = await this.pool.query<{ id: number }>(
        "SELECT id FROM messages WHERE direction = 'inbound' AND provider_message_id = $1", [providerMessageId]);
      id = existing.rows[0]?.id;
    }
    if (!id) throw new Error("Failed to store or locate inbound message");
    if (created) await this.pool.query("UPDATE conversations SET last_message_at = now() WHERE id = $1", [conversationId]);
    return { id, created };
  }

  async createOutboundMessage(conversationId: number, body: string): Promise<number> {
    const result = await this.pool.query<{ id: number }>(
      `INSERT INTO messages (conversation_id, direction, body, sender_jid, delivery_status)
       VALUES ($1, 'outbound', $2, 'me', 'pending') RETURNING id`, [conversationId, body]);
    const id = result.rows[0]?.id;
    if (!id) throw new Error("Failed to create outbound message");
    return id;
  }

  async startDeliveryAttempt(messageId: number): Promise<number> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query<{ delivery_attempt_count: number }>(
        `UPDATE messages SET delivery_status = 'sending', delivery_attempt_count = delivery_attempt_count + 1,
           last_delivery_error = NULL, next_retry_at = NULL
         WHERE id = $1 AND direction = 'outbound' RETURNING delivery_attempt_count`, [messageId]);
      const attempt = result.rows[0]?.delivery_attempt_count;
      if (!attempt) throw new Error("Outbound message not found");
      await client.query("INSERT INTO message_delivery_attempts (message_id, attempt_number, status) VALUES ($1, $2, 'started')", [messageId, attempt]);
      await client.query("COMMIT");
      return attempt;
    } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
  }

  async completeDeliveryAttempt(messageId: number, attempt: number, providerMessageId: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `UPDATE messages SET delivery_status = 'sent', provider_message_id = $2, provider_sent_at = now(),
           last_delivery_error = NULL, next_retry_at = NULL WHERE id = $1`, [messageId, providerMessageId]);
      await client.query(
        `UPDATE message_delivery_attempts SET status = 'succeeded', provider_message_id = $3, finished_at = now()
         WHERE message_id = $1 AND attempt_number = $2`, [messageId, attempt, providerMessageId]);
      await client.query("UPDATE conversations SET last_message_at = now() WHERE id = (SELECT conversation_id FROM messages WHERE id = $1)", [messageId]);
      await client.query("COMMIT");
    } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
  }

  async failDeliveryAttempt(messageId: number, attempt: number, error: unknown, deliveryUnknown: boolean): Promise<void> {
    const errorMessage = error instanceof Error ? error.message.slice(0, 1000) : "Unknown delivery error";
    const status: DeliveryStatus = deliveryUnknown ? "delivery_unknown" : "failed";
    const retryDelaySeconds = Math.min(300, 2 ** attempt * 5);
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `UPDATE messages SET delivery_status = $2, last_delivery_error = $3,
           next_retry_at = CASE WHEN $2 = 'failed' THEN now() + ($4 * interval '1 second') ELSE NULL END WHERE id = $1`,
        [messageId, status, errorMessage, retryDelaySeconds]);
      await client.query(
        `UPDATE message_delivery_attempts SET status = $3, error_code = $4, error_message = $5, finished_at = now()
         WHERE message_id = $1 AND attempt_number = $2`,
        [messageId, attempt, status, error instanceof Error ? error.name : "unknown_error", errorMessage]);
      await client.query("COMMIT");
    } catch (trackingError) { await client.query("ROLLBACK"); throw trackingError; } finally { client.release(); }
  }

  async getDeliveryFailures(limit = 100): Promise<MessageRecord[]> {
    const result = await this.pool.query<MessageRow>(
      `SELECT id, conversation_id, direction, body, sender_jid, provider_message_id, delivery_status,
              delivery_attempt_count, last_delivery_error, created_at FROM messages
       WHERE direction = 'outbound' AND delivery_status IN ('failed', 'delivery_unknown')
       ORDER BY created_at DESC LIMIT $1`, [limit]);
    return result.rows.map((row) => this.toMessage(row));
  }

  async getRetryableOutboundMessage(messageId: number): Promise<RetryableMessage | null> {
    const result = await this.pool.query<MessageRow & { whatsapp_jid: string }>(
      `SELECT m.id, m.conversation_id, m.direction, m.body, m.sender_jid, m.provider_message_id,
              m.delivery_status, m.delivery_attempt_count, m.last_delivery_error, m.created_at,
              c.whatsapp_jid
       FROM messages m JOIN conversations c ON c.id = m.conversation_id
       WHERE m.id = $1 AND m.direction = 'outbound' AND m.delivery_status = 'failed'`,
      [messageId],
    );
    const row = result.rows[0];
    return row ? { ...this.toMessage(row), whatsappJid: row.whatsapp_jid } : null;
  }

  async listConversations(): Promise<ConversationSummary[]> {
    const result = await this.pool.query<{
      id: number; whatsapp_jid: string; phone_number: string; display_name: string | null;
      last_message_at: string | null; last_message_body: string | null; client_id: number | null; client_name: string | null;
    }>(`SELECT c.id, c.whatsapp_jid, c.phone_number, c.display_name, c.last_message_at,
              c.client_id, client.name AS client_name,
              (SELECT body FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message_body
         FROM conversations c LEFT JOIN clients client ON client.id = c.client_id
         ORDER BY c.last_message_at DESC NULLS LAST`);
    return result.rows.map((row) => ({ id: row.id, whatsappJid: row.whatsapp_jid, phoneNumber: row.phone_number,
      displayName: row.display_name, lastMessageAt: row.last_message_at, lastMessageBody: row.last_message_body,
      clientId: row.client_id, clientName: row.client_name }));
  }

  async getConversation(id: number): Promise<ConversationRecord | null> {
    const result = await this.pool.query<{ id: number; whatsapp_jid: string; phone_number: string; display_name: string | null }>(
      "SELECT id, whatsapp_jid, phone_number, display_name FROM conversations WHERE id = $1", [id]);
    const row = result.rows[0];
    return row ? { id: row.id, whatsappJid: row.whatsapp_jid, phoneNumber: row.phone_number, displayName: row.display_name } : null;
  }

  async listMessages(conversationId: number): Promise<MessageRecord[]> {
    const result = await this.pool.query<MessageRow>(
      `SELECT id, conversation_id, direction, body, sender_jid, provider_message_id, delivery_status,
              delivery_attempt_count, last_delivery_error, created_at
       FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC`, [conversationId]);
    return result.rows.map((row) => this.toMessage(row));
  }
}
