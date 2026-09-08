import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  ServiceUnavailableException,
} from "@nestjs/common";
import { createHash } from "node:crypto";
import type { Pool } from "pg";
import { recordAudit } from "../../database/audit";
import { PG_POOL } from "../../database/database.module";
import { ConversationsService } from "./conversations.service";
import { MESSAGING_CHANNEL, type InboundMessage, type MessagingChannel } from "./messaging-channel.interface";
import { MessagingGateway } from "./messaging.gateway";
import { DraftIntakesService } from "./draft-intakes.service";
import { VoiceNoteTranscoder } from "./voice-note-transcoder";

const MAX_VOICE_NOTE_BYTES = 10 * 1024 * 1024;

function detectedAudioMimeType(data: Buffer): string | null {
  if (data.length >= 4 && data.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))) {
    return "audio/webm; codecs=opus";
  }
  if (data.length >= 4 && data.subarray(0, 4).toString("ascii") === "OggS") {
    return "audio/ogg; codecs=opus";
  }
  if (data.length >= 12 && data.subarray(4, 8).toString("ascii") === "ftyp") {
    return "audio/mp4";
  }
  if (data.length >= 12 && data.subarray(0, 4).toString("ascii") === "RIFF" && data.subarray(8, 12).toString("ascii") === "WAVE") {
    return "audio/wav";
  }
  if (data.length >= 3 && data.subarray(0, 3).toString("ascii") === "ID3") return "audio/mpeg";
  if (data.length >= 2 && data[0] === 0xff && (data[1]! & 0xe0) === 0xe0) return "audio/mpeg";
  return null;
}

export function validateVoiceNote(data: Buffer, durationSeconds: number | null) {
  if (data.length === 0) throw new BadRequestException("The voice note is empty");
  if (data.length > MAX_VOICE_NOTE_BYTES) throw new BadRequestException("Voice notes must be 10 MB or smaller");
  const mimeType = detectedAudioMimeType(data);
  if (!mimeType) throw new BadRequestException("Unsupported or invalid audio file");
  if (durationSeconds !== null && (!Number.isInteger(durationSeconds) || durationSeconds < 0 || durationSeconds > 3600)) {
    throw new BadRequestException("Voice-note duration is invalid");
  }
  return {
    data,
    mimeType,
    sizeBytes: data.length,
    sha256: createHash("sha256").update(data).digest("hex"),
    durationSeconds,
  };
}

export type WhatsAppAccountStatus = {
  id: number;
  label: string;
  status: "qr_pending" | "connected" | "disconnected";
  qr: string | null;
  phoneNumber: string | null;
  isPrimary: boolean;
  createdAt: string;
  lastConnectedAt: string | null;
};

type AccountRow = {
  id: number; label: string; auth_key: string; status: WhatsAppAccountStatus["status"];
  phone_number: string | null; is_primary: boolean; created_at: string; last_connected_at: string | null;
};

@Injectable()
export class MessagingService implements OnModuleInit {
  private readonly logger = new Logger(MessagingService.name);
  private readonly accounts = new Map<number, WhatsAppAccountStatus & { authKey: string }>();

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    @Inject(MESSAGING_CHANNEL) private readonly channel: MessagingChannel,
    private readonly conversations: ConversationsService,
    private readonly gateway: MessagingGateway,
    private readonly draftIntakes: DraftIntakesService,
    private readonly voiceNoteTranscoder: VoiceNoteTranscoder,
  ) {}

  async onModuleInit(): Promise<void> {
    this.channel.onStatusChange((accountId, status, qr, phoneNumber) => {
      const account = this.accounts.get(accountId);
      if (account) {
        Object.assign(account, { status, qr, phoneNumber, ...(status === "connected" ? { lastConnectedAt: new Date().toISOString() } : {}) });
      }
      void this.pool.query(
        `UPDATE whatsapp_connections SET status = $2, phone_number = $3,
           last_connected_at = CASE WHEN $2 = 'connected' THEN now() ELSE last_connected_at END,
           updated_at = now() WHERE id = $1`,
        [accountId, status, phoneNumber],
      ).catch((error) => this.logger.error(`Failed to persist account ${accountId} status: ${(error as Error).message}`));
      this.gateway.emitStatus({ accountId, status, qr, phoneNumber });
    });

    this.channel.onMessage((message) => {
      this.handleInbound(message).catch((err) =>
        this.logger.error(`Failed to store inbound message: ${(err as Error).message}`),
      );
    });

    this.channel.onNameChange(({ accountId, jid, displayName }) => {
      this.conversations
        .updateDisplayName(accountId, jid, displayName)
        .then((conversationId) => {
          if (conversationId !== null) this.gateway.emitConversationUpdated(conversationId);
        })
        .catch((err) =>
          this.logger.error(`Failed to store WhatsApp display name: ${(err as Error).message}`),
        );
    });

    const result = await this.pool.query<AccountRow>(
      `SELECT id, label, auth_key, status, phone_number, is_primary, created_at, last_connected_at
       FROM whatsapp_connections WHERE active = true ORDER BY is_primary DESC, id`,
    );
    for (const row of result.rows) {
      this.accounts.set(row.id, {
        id: row.id, label: row.label, authKey: row.auth_key, status: "disconnected", qr: null,
        phoneNumber: row.phone_number, isPrimary: row.is_primary, createdAt: row.created_at,
        lastConnectedAt: row.last_connected_at,
      });
    }
    await Promise.all(result.rows.map((row) => this.channel.initializeAccount({ id: row.id, authKey: row.auth_key })));
  }

  private async handleInbound(message: InboundMessage): Promise<void> {
    const conversationId = await this.conversations.findOrCreateConversation(
      message.accountId,
      message.jid,
      message.phoneNumber,
      message.displayName,
    );
    const stored = await this.conversations.appendInboundMessage(
      conversationId,
      message.body,
      message.senderJid,
      message.providerMessageId,
      message.messageType,
      message.audio,
    );
    if (!stored.created) {
      this.logger.debug(`Ignored duplicate inbound provider message ${message.providerMessageId}`);
      return;
    }
    const messageId = stored.id;
    this.gateway.emitNewMessage(conversationId);
    if (message.messageType === "text") {
      void this.draftIntakes.analyzeInboundMessage(messageId).catch((err) =>
        this.logger.error(`Failed to analyze inbound message: ${(err as Error).message}`),
      );
    }
  }

  private account(accountId?: number): WhatsAppAccountStatus & { authKey: string } {
    const account = accountId === undefined
      ? [...this.accounts.values()].find((item) => item.isPrimary) ?? [...this.accounts.values()][0]
      : this.accounts.get(accountId);
    if (!account) throw new NotFoundException("WhatsApp account not found");
    return account;
  }

  getStatus(accountId?: number): WhatsAppAccountStatus {
    const account = this.account(accountId);
    return { id: account.id, label: account.label, status: account.status, qr: account.qr,
      phoneNumber: account.phoneNumber, isPrimary: account.isPrimary, createdAt: account.createdAt,
      lastConnectedAt: account.lastConnectedAt };
  }

  listAccounts(): WhatsAppAccountStatus[] {
    return [...this.accounts.values()].map((account) => this.getStatus(account.id));
  }

  async createAccount(label: string, actorUserId: number): Promise<WhatsAppAccountStatus> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const inserted = await client.query<{ id: number; created_at: string }>(
        `INSERT INTO whatsapp_connections (id, label, status, auth_key, is_primary)
         SELECT nextval('whatsapp_connections_id_seq'), $1, 'disconnected',
                'pending-' || currval('whatsapp_connections_id_seq')::text, false
         RETURNING id, created_at`,
        [label],
      );
      const row = inserted.rows[0];
      if (!row) throw new Error("Failed to create WhatsApp account");
      const authKey = `account-${row.id}`;
      await client.query("UPDATE whatsapp_connections SET auth_key = $2 WHERE id = $1", [row.id, authKey]);
      await recordAudit(client, actorUserId, "whatsapp.account_created", "whatsapp_connection", row.id, null, { label, authKey });
      await client.query("COMMIT");
      const account = { id: row.id, label, authKey, status: "disconnected" as const, qr: null,
        phoneNumber: null, isPrimary: false, createdAt: row.created_at, lastConnectedAt: null };
      this.accounts.set(row.id, account);
      await this.channel.initializeAccount({ id: row.id, authKey });
      return this.getStatus(row.id);
    } catch (error) {
      await client.query("ROLLBACK");
      if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
        throw new BadRequestException("An active WhatsApp account already uses this name");
      }
      throw error;
    } finally { client.release(); }
  }

  async reconnect(accountId?: number): Promise<WhatsAppAccountStatus> {
    const account = this.account(accountId);
    await this.channel.reconnect(account.id);
    return this.getStatus(account.id);
  }

  async disconnect(actorUserId: number, accountId?: number): Promise<WhatsAppAccountStatus> {
    const account = this.account(accountId);
    const before = this.getStatus(account.id);
    await this.channel.disconnect(account.id);
    const after = this.getStatus(account.id);
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await recordAudit(
        client,
        actorUserId,
        "whatsapp.connection_disconnected",
        "whatsapp_connection",
        account.id,
        { status: before.status, phoneNumber: before.phoneNumber },
        { status: after.status, phoneNumber: after.phoneNumber },
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    return after;
  }

  listConversations() {
    return this.conversations.listConversations();
  }

  listMessages(conversationId: number) {
    return this.conversations.listMessages(conversationId);
  }

  listDeliveryFailures() {
    return this.conversations.getDeliveryFailures();
  }

  private async deliverTrackedMessage(messageId: number, accountId: number, jid: string, text: string): Promise<void> {
    await this.deliverTracked(messageId, () => this.channel.sendMessage(accountId, jid, text));
  }

  private async deliverTrackedVoiceNote(
    messageId: number,
    accountId: number,
    jid: string,
    voiceNote: { data: Buffer; mimeType: string; durationSeconds: number | null },
  ): Promise<void> {
    await this.deliverTracked(messageId, () => this.channel.sendVoiceNote(accountId, jid, voiceNote));
  }

  private async deliverTracked(
    messageId: number,
    send: () => Promise<{ providerMessageId: string }>,
  ): Promise<void> {
    let delivered = false;
    let finalError: unknown;
    for (let retry = 0; retry < 3 && !delivered; retry += 1) {
      const attempt = await this.conversations.startDeliveryAttempt(messageId);
      try {
        const result = await send();
        await this.conversations.completeDeliveryAttempt(messageId, attempt, result.providerMessageId);
        delivered = true;
      } catch (error) {
        finalError = error;
        const errorText = error instanceof Error ? error.message.toLowerCase() : "";
        const deliveryUnknown = /timeout|timed out|connection closed|socket closed/.test(errorText);
        await this.conversations.failDeliveryAttempt(messageId, attempt, error, deliveryUnknown);
        if (deliveryUnknown) break;
        if (retry < 2) await new Promise((resolve) => setTimeout(resolve, 250 * (retry + 1)));
      }
    }
    if (!delivered) {
      throw new ServiceUnavailableException(
        finalError instanceof Error ? `WhatsApp delivery failed: ${finalError.message}` : "WhatsApp delivery failed",
      );
    }
  }

  async retryFailedMessage(messageId: number, actorUserId: number): Promise<void> {
    const message = await this.conversations.getRetryableOutboundMessage(messageId);
    if (!message) {
      throw new BadRequestException(
        "Only messages with confirmed failed delivery can be retried. Delivery-unknown messages require provider review to prevent duplicates.",
      );
    }
    if (message.messageType === "audio") {
      if (!message.audioData || !message.audioMimeType) {
        throw new BadRequestException("The stored audio for this voice note is unavailable");
      }
      await this.deliverTrackedVoiceNote(message.id, message.accountId, message.whatsappJid, {
        data: message.audioData,
        mimeType: message.audioMimeType,
        durationSeconds: message.audioDurationSeconds,
      });
    } else {
      await this.deliverTrackedMessage(message.id, message.accountId, message.whatsappJid, message.body);
    }
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await recordAudit(client, actorUserId, "message.delivery_retried", "message", message.id, null, {
        conversationId: message.conversationId,
        totalAttempts: message.deliveryAttemptCount + 1,
      });
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    this.gateway.emitNewMessage(message.conversationId);
  }

  async startDirectConversation(input: string, accountId?: number): Promise<{ id: number }> {
    const phoneNumber = input.replace(/[\s()+.\-]/g, "").replace(/^00/, "");
    if (!/^[1-9]\d{7,14}$/.test(phoneNumber)) {
      throw new BadRequestException(
        "Enter a valid international phone number including the country code",
      );
    }
    const account = this.account(accountId);
    if (this.channel.getStatus(account.id) !== "connected") {
      throw new ServiceUnavailableException(`${account.label} is not connected`);
    }

    const recipient = await this.channel.resolveDirectRecipient(account.id, phoneNumber);
    if (!recipient) {
      throw new NotFoundException("This phone number is not registered on WhatsApp");
    }

    const id = await this.conversations.findOrCreateConversation(
      account.id,
      recipient.jid,
      recipient.phoneNumber,
      recipient.displayName,
    );
    this.gateway.emitConversationUpdated(id);
    return { id };
  }

  async sendReply(
    conversationId: number,
    text: string,
    actorUserId: number,
    travelRequestId?: number,
  ): Promise<void> {
    const conversation = await this.conversations.getConversation(conversationId);
    if (!conversation) throw new Error("Conversation not found");
    if (travelRequestId) {
      const linked = await this.pool.query(
        `SELECT 1
         FROM travel_requests r
         JOIN ai_draft_intakes d ON d.id = r.source_draft_intake_id
         WHERE r.id = $1 AND d.conversation_id = $2`,
        [travelRequestId, conversationId],
      );
      if ((linked.rowCount ?? 0) === 0) {
        throw new BadRequestException("This WhatsApp conversation is not linked to the selected request");
      }
    }
    const messageId = await this.conversations.createOutboundMessage(conversationId, text);
    await this.deliverTrackedMessage(messageId, conversation.accountId, conversation.whatsappJid, text);
    if (travelRequestId) {
      const client = await this.pool.connect();
      try {
        await client.query("BEGIN");
        await client.query(
          `UPDATE travel_requests SET first_response_at = COALESCE(first_response_at, now()), updated_at = now()
           WHERE id = $1`,
          [travelRequestId],
        );
        await recordAudit(
          client,
          actorUserId,
          "travel_request.client_reply_sent",
          "travel_request",
          travelRequestId,
          null,
          { conversationId, messageId, characterCount: text.length },
        );
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    }
    this.gateway.emitNewMessage(conversationId);
  }

  async sendVoiceNote(
    conversationId: number,
    data: Buffer,
    durationSeconds: number | null,
    actorUserId: number,
  ): Promise<void> {
    const conversation = await this.conversations.getConversation(conversationId);
    if (!conversation) throw new NotFoundException("Conversation not found");
    if (this.channel.getStatus(conversation.accountId) !== "connected") {
      throw new ServiceUnavailableException("The WhatsApp account for this conversation is not connected");
    }
    const uploadedVoiceNote = validateVoiceNote(data, durationSeconds);
    const voiceNote = await this.voiceNoteTranscoder.prepareForWhatsApp(uploadedVoiceNote);
    const messageId = await this.conversations.createOutboundVoiceNote(conversationId, voiceNote);
    await this.deliverTrackedVoiceNote(messageId, conversation.accountId, conversation.whatsappJid, voiceNote);
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await recordAudit(client, actorUserId, "message.voice_note_sent", "message", messageId, null, {
        conversationId,
        sizeBytes: voiceNote.sizeBytes,
        durationSeconds: voiceNote.durationSeconds,
        sha256: voiceNote.sha256,
      });
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    this.gateway.emitNewMessage(conversationId);
  }

  async getMessageAudio(messageId: number) {
    const audio = await this.conversations.getMessageAudio(messageId);
    if (!audio) throw new NotFoundException("Voice note not found");
    return audio;
  }
}
