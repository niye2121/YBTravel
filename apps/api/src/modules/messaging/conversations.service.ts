import { Inject, Injectable } from "@nestjs/common";
import type { Pool } from "pg";
import { PG_POOL } from "../../database/database.module";

export type MessageDirection = "inbound" | "outbound";

export type ConversationSummary = {
  id: number;
  whatsappJid: string;
  phoneNumber: string;
  displayName: string | null;
  lastMessageAt: string | null;
  lastMessageBody: string | null;
};

export type ConversationRecord = {
  id: number;
  whatsappJid: string;
  phoneNumber: string;
  displayName: string | null;
};

export type MessageRecord = {
  id: number;
  conversationId: number;
  direction: MessageDirection;
  body: string;
  senderJid: string;
  createdAt: string;
};

@Injectable()
export class ConversationsService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async findOrCreateConversation(
    jid: string,
    phoneNumber: string,
    displayName: string | null,
  ): Promise<number> {
    const inserted = await this.pool.query<{ id: number }>(
      `INSERT INTO conversations (whatsapp_jid, phone_number, display_name)
       VALUES ($1, $2, $3)
       ON CONFLICT (whatsapp_jid) DO UPDATE SET
         phone_number = EXCLUDED.phone_number,
         display_name = COALESCE(EXCLUDED.display_name, conversations.display_name)
       RETURNING id`,
      [jid, phoneNumber, displayName],
    );
    const row = inserted.rows[0];
    if (!row) throw new Error("Failed to create conversation");
    return row.id;
  }

  async updateDisplayName(jid: string, displayName: string): Promise<number | null> {
    const result = await this.pool.query<{ id: number }>(
      `UPDATE conversations SET display_name = $2
       WHERE whatsapp_jid = $1 AND display_name IS DISTINCT FROM $2
       RETURNING id`,
      [jid, displayName],
    );
    return result.rows[0]?.id ?? null;
  }

  async appendMessage(
    conversationId: number,
    direction: MessageDirection,
    body: string,
    senderJid: string,
  ): Promise<void> {
    await this.pool.query(
      "INSERT INTO messages (conversation_id, direction, body, sender_jid) VALUES ($1, $2, $3, $4)",
      [conversationId, direction, body, senderJid],
    );
    await this.pool.query("UPDATE conversations SET last_message_at = now() WHERE id = $1", [
      conversationId,
    ]);
  }

  async listConversations(): Promise<ConversationSummary[]> {
    const result = await this.pool.query<{
      id: number;
      whatsapp_jid: string;
      phone_number: string;
      display_name: string | null;
      last_message_at: string | null;
      last_message_body: string | null;
    }>(
      `SELECT c.id, c.whatsapp_jid, c.phone_number, c.display_name, c.last_message_at,
              (SELECT body FROM messages m WHERE m.conversation_id = c.id
                 ORDER BY m.created_at DESC LIMIT 1) AS last_message_body
       FROM conversations c
       ORDER BY c.last_message_at DESC NULLS LAST`,
    );
    return result.rows.map((r) => ({
      id: r.id,
      whatsappJid: r.whatsapp_jid,
      phoneNumber: r.phone_number,
      displayName: r.display_name,
      lastMessageAt: r.last_message_at,
      lastMessageBody: r.last_message_body,
    }));
  }

  async getConversation(id: number): Promise<ConversationRecord | null> {
    const result = await this.pool.query<{
      id: number;
      whatsapp_jid: string;
      phone_number: string;
      display_name: string | null;
    }>(
      "SELECT id, whatsapp_jid, phone_number, display_name FROM conversations WHERE id = $1",
      [id],
    );
    const row = result.rows[0];
    if (!row) return null;
    return {
      id: row.id,
      whatsappJid: row.whatsapp_jid,
      phoneNumber: row.phone_number,
      displayName: row.display_name,
    };
  }

  async listMessages(conversationId: number): Promise<MessageRecord[]> {
    const result = await this.pool.query<{
      id: number;
      conversation_id: number;
      direction: MessageDirection;
      body: string;
      sender_jid: string;
      created_at: string;
    }>(
      `SELECT id, conversation_id, direction, body, sender_jid, created_at
       FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC`,
      [conversationId],
    );
    return result.rows.map((r) => ({
      id: r.id,
      conversationId: r.conversation_id,
      direction: r.direction,
      body: r.body,
      senderJid: r.sender_jid,
      createdAt: r.created_at,
    }));
  }
}
