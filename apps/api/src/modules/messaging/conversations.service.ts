import { Inject, Injectable } from "@nestjs/common";
import type { Pool, PoolClient } from "pg";
import { PG_POOL } from "../../database/database.module";

export type MessageDirection = "inbound" | "outbound";
export type MessageType = "text" | "audio";
export type DeliveryStatus = "pending" | "sending" | "sent" | "received" | "failed" | "delivery_unknown";

export type MessageAudioInput = {
  data: Buffer;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  durationSeconds: number | null;
};

export type MessageAudioRecord = MessageAudioInput & { messageId: number };

export type ConversationSummary = {
  id: number; accountId: number; accountLabel: string; whatsappJid: string; phoneNumber: string; displayName: string | null;
  lastMessageAt: string | null; lastMessageBody: string | null; clientId: number | null; clientName: string | null;
};
export type ConversationRecord = { id: number; accountId: number; accountLabel: string; whatsappJid: string; phoneNumber: string; displayName: string | null };
export type MessageRecord = {
  id: number; conversationId: number; direction: MessageDirection; messageType: MessageType; body: string; senderJid: string;
  providerMessageId: string | null; deliveryStatus: DeliveryStatus; deliveryAttemptCount: number;
  lastDeliveryError: string | null; hasAudio: boolean; audioMimeType: string | null;
  audioSizeBytes: number | null; audioDurationSeconds: number | null; createdAt: string;
};
export type RetryableMessage = MessageRecord & { accountId: number; whatsappJid: string; audioData: Buffer | null; audioSha256: string | null };
type MessageRow = {
  id: number; conversation_id: number; direction: MessageDirection; message_type: MessageType; body: string; sender_jid: string;
  provider_message_id: string | null; delivery_status: DeliveryStatus; delivery_attempt_count: number;
  last_delivery_error: string | null; audio_mime_type: string | null; audio_size_bytes: number | null;
  audio_duration_seconds: number | null; audio_data?: Buffer | null; audio_sha256?: string | null; created_at: string;
};

@Injectable()
export class ConversationsService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  private toMessage(row: MessageRow): MessageRecord {
    return { id: row.id, conversationId: row.conversation_id, direction: row.direction, messageType: row.message_type, body: row.body,
      senderJid: row.sender_jid, providerMessageId: row.provider_message_id,
      deliveryStatus: row.delivery_status, deliveryAttemptCount: row.delivery_attempt_count,
      lastDeliveryError: row.last_delivery_error, hasAudio: Boolean(row.audio_mime_type),
      audioMimeType: row.audio_mime_type, audioSizeBytes: row.audio_size_bytes,
      audioDurationSeconds: row.audio_duration_seconds, createdAt: row.created_at };
  }

  async findOrCreateConversation(accountId: number, jid: string, phoneNumber: string, displayName: string | null): Promise<number> {
    const result = await this.pool.query<{ id: number }>(
      `INSERT INTO conversations (whatsapp_connection_id, whatsapp_jid, phone_number, display_name) VALUES ($1, $2, $3, $4)
       ON CONFLICT (whatsapp_connection_id, whatsapp_jid) DO UPDATE SET phone_number = EXCLUDED.phone_number,
         display_name = COALESCE(EXCLUDED.display_name, conversations.display_name) RETURNING id`,
      [accountId, jid, phoneNumber, displayName]);
    const id = result.rows[0]?.id;
    if (!id) throw new Error("Failed to create conversation");
    return id;
  }

  async updateDisplayName(accountId: number, jid: string, displayName: string): Promise<number | null> {
    const result = await this.pool.query<{ id: number }>(
      "UPDATE conversations SET display_name = $3 WHERE whatsapp_connection_id = $1 AND whatsapp_jid = $2 AND display_name IS DISTINCT FROM $3 RETURNING id",
      [accountId, jid, displayName]);
    return result.rows[0]?.id ?? null;
  }

  async appendInboundMessage(conversationId: number, body: string, senderJid: string, providerMessageId: string, messageType: MessageType = "text", audio: MessageAudioInput | null = null): Promise<{ id: number; created: boolean }> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const inserted = await client.query<{ id: number }>(
        `INSERT INTO messages (conversation_id, direction, message_type, body, sender_jid, provider_message_id, delivery_status)
         VALUES ($1, 'inbound', $2, $3, $4, $5, 'received')
         ON CONFLICT (direction, provider_message_id) WHERE provider_message_id IS NOT NULL DO NOTHING RETURNING id`,
        [conversationId, messageType, body, senderJid, providerMessageId]);
      let id = inserted.rows[0]?.id;
      const created = Boolean(id);
      if (!id) {
        const existing = await client.query<{ id: number }>(
          "SELECT id FROM messages WHERE direction = 'inbound' AND provider_message_id = $1", [providerMessageId]);
        id = existing.rows[0]?.id;
      }
      if (!id) throw new Error("Failed to store or locate inbound message");
      if (created && audio) await this.insertAudio(client, id, audio);
      if (created) await client.query("UPDATE conversations SET last_message_at = now() WHERE id = $1", [conversationId]);
      await client.query("COMMIT");
      return { id, created };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async createOutboundMessage(conversationId: number, body: string): Promise<number> {
    const result = await this.pool.query<{ id: number }>(
      `INSERT INTO messages (conversation_id, direction, body, sender_jid, delivery_status)
       VALUES ($1, 'outbound', $2, 'me', 'pending') RETURNING id`, [conversationId, body]);
    const id = result.rows[0]?.id;
    if (!id) throw new Error("Failed to create outbound message");
    return id;
  }

  async createOutboundVoiceNote(conversationId: number, audio: MessageAudioInput): Promise<number> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query<{ id: number }>(
        `INSERT INTO messages (conversation_id, direction, message_type, body, sender_jid, delivery_status)
         VALUES ($1, 'outbound', 'audio', '[Voice note]', 'me', 'pending') RETURNING id`, [conversationId]);
      const id = result.rows[0]?.id;
      if (!id) throw new Error("Failed to create outbound voice note");
      await this.insertAudio(client, id, audio);
      await client.query("COMMIT");
      return id;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  private async insertAudio(db: Pick<PoolClient, "query">, messageId: number, audio: MessageAudioInput): Promise<void> {
    await db.query(
      `INSERT INTO message_media (message_id, mime_type, size_bytes, sha256, duration_seconds, data)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [messageId, audio.mimeType, audio.sizeBytes, audio.sha256, audio.durationSeconds, audio.data],
    );
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
      `SELECT m.id, m.conversation_id, m.direction, m.message_type, m.body, m.sender_jid,
              m.provider_message_id, m.delivery_status, m.delivery_attempt_count, m.last_delivery_error,
              media.mime_type AS audio_mime_type, media.size_bytes AS audio_size_bytes,
              media.duration_seconds AS audio_duration_seconds, m.created_at
       FROM messages m LEFT JOIN message_media media ON media.message_id = m.id
       WHERE m.direction = 'outbound' AND m.delivery_status IN ('failed', 'delivery_unknown')
       ORDER BY m.created_at DESC LIMIT $1`, [limit]);
    return result.rows.map((row) => this.toMessage(row));
  }

  async getRetryableOutboundMessage(messageId: number): Promise<RetryableMessage | null> {
    const result = await this.pool.query<MessageRow & { whatsapp_jid: string; whatsapp_connection_id: number }>(
      `SELECT m.id, m.conversation_id, m.direction, m.message_type, m.body, m.sender_jid, m.provider_message_id,
              m.delivery_status, m.delivery_attempt_count, m.last_delivery_error, m.created_at,
              c.whatsapp_jid, c.whatsapp_connection_id, media.mime_type AS audio_mime_type, media.size_bytes AS audio_size_bytes,
              media.duration_seconds AS audio_duration_seconds, media.data AS audio_data,
              media.sha256 AS audio_sha256
       FROM messages m JOIN conversations c ON c.id = m.conversation_id
       LEFT JOIN message_media media ON media.message_id = m.id
       WHERE m.id = $1 AND m.direction = 'outbound' AND m.delivery_status = 'failed'`,
      [messageId],
    );
    const row = result.rows[0];
    return row ? { ...this.toMessage(row), accountId: row.whatsapp_connection_id, whatsappJid: row.whatsapp_jid,
      audioData: row.audio_data ?? null, audioSha256: row.audio_sha256 ?? null } : null;
  }

  async listConversations(): Promise<ConversationSummary[]> {
    const result = await this.pool.query<{
      id: number; whatsapp_connection_id: number; account_label: string; whatsapp_jid: string; phone_number: string; display_name: string | null;
      last_message_at: string | null; last_message_body: string | null; client_id: number | null; client_name: string | null;
    }>(`SELECT c.id, c.whatsapp_connection_id, wc.label AS account_label, c.whatsapp_jid, c.phone_number, c.display_name, c.last_message_at,
              c.client_id, client.name AS client_name,
              (SELECT body FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message_body
         FROM conversations c JOIN whatsapp_connections wc ON wc.id = c.whatsapp_connection_id
         LEFT JOIN clients client ON client.id = c.client_id
         ORDER BY c.last_message_at DESC NULLS LAST`);
    return result.rows.map((row) => ({ id: row.id, accountId: row.whatsapp_connection_id, accountLabel: row.account_label,
      whatsappJid: row.whatsapp_jid, phoneNumber: row.phone_number,
      displayName: row.display_name, lastMessageAt: row.last_message_at, lastMessageBody: row.last_message_body,
      clientId: row.client_id, clientName: row.client_name }));
  }

  async getConversation(id: number): Promise<ConversationRecord | null> {
    const result = await this.pool.query<{ id: number; whatsapp_connection_id: number; account_label: string; whatsapp_jid: string; phone_number: string; display_name: string | null }>(
      `SELECT c.id, c.whatsapp_connection_id, wc.label AS account_label, c.whatsapp_jid, c.phone_number, c.display_name
       FROM conversations c JOIN whatsapp_connections wc ON wc.id = c.whatsapp_connection_id WHERE c.id = $1`, [id]);
    const row = result.rows[0];
    return row ? { id: row.id, accountId: row.whatsapp_connection_id, accountLabel: row.account_label,
      whatsappJid: row.whatsapp_jid, phoneNumber: row.phone_number, displayName: row.display_name } : null;
  }

  async listMessages(conversationId: number): Promise<MessageRecord[]> {
    const result = await this.pool.query<MessageRow>(
      `SELECT m.id, m.conversation_id, m.direction, m.message_type, m.body, m.sender_jid,
              m.provider_message_id, m.delivery_status, m.delivery_attempt_count, m.last_delivery_error,
              media.mime_type AS audio_mime_type, media.size_bytes AS audio_size_bytes,
              media.duration_seconds AS audio_duration_seconds, m.created_at
       FROM messages m LEFT JOIN message_media media ON media.message_id = m.id
       WHERE m.conversation_id = $1 ORDER BY m.created_at ASC`, [conversationId]);
    return result.rows.map((row) => this.toMessage(row));
  }

  async getMessageAudio(messageId: number): Promise<MessageAudioRecord | null> {
    const result = await this.pool.query<{
      message_id: number; mime_type: string; size_bytes: number; sha256: string;
      duration_seconds: number | null; data: Buffer;
    }>(`SELECT message_id, mime_type, size_bytes, sha256, duration_seconds, data
        FROM message_media WHERE message_id = $1`, [messageId]);
    const row = result.rows[0];
    return row ? { messageId: row.message_id, mimeType: row.mime_type, sizeBytes: row.size_bytes,
      sha256: row.sha256, durationSeconds: row.duration_seconds, data: row.data } : null;
  }
}
