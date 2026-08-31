import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  ServiceUnavailableException,
} from "@nestjs/common";
import type { Pool } from "pg";
import { recordAudit } from "../../database/audit";
import { PG_POOL } from "../../database/database.module";
import { ConversationsService } from "./conversations.service";
import { MESSAGING_CHANNEL, type InboundMessage, type MessagingChannel } from "./messaging-channel.interface";
import { MessagingGateway } from "./messaging.gateway";
import { DraftIntakesService } from "./draft-intakes.service";

@Injectable()
export class MessagingService implements OnModuleInit {
  private readonly logger = new Logger(MessagingService.name);

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    @Inject(MESSAGING_CHANNEL) private readonly channel: MessagingChannel,
    private readonly conversations: ConversationsService,
    private readonly gateway: MessagingGateway,
    private readonly draftIntakes: DraftIntakesService,
  ) {}

  onModuleInit(): void {
    this.channel.onStatusChange((status, qr, phoneNumber) => {
      this.gateway.emitStatus({ status, qr, phoneNumber });
    });

    this.channel.onMessage((message) => {
      this.handleInbound(message).catch((err) =>
        this.logger.error(`Failed to store inbound message: ${(err as Error).message}`),
      );
    });

    this.channel.onNameChange(({ jid, displayName }) => {
      this.conversations
        .updateDisplayName(jid, displayName)
        .then((conversationId) => {
          if (conversationId !== null) this.gateway.emitConversationUpdated(conversationId);
        })
        .catch((err) =>
          this.logger.error(`Failed to store WhatsApp display name: ${(err as Error).message}`),
        );
    });
  }

  private async handleInbound(message: InboundMessage): Promise<void> {
    const conversationId = await this.conversations.findOrCreateConversation(
      message.jid,
      message.phoneNumber,
      message.displayName,
    );
    const stored = await this.conversations.appendInboundMessage(
      conversationId,
      message.body,
      message.senderJid,
      message.providerMessageId,
    );
    if (!stored.created) {
      this.logger.debug(`Ignored duplicate inbound provider message ${message.providerMessageId}`);
      return;
    }
    const messageId = stored.id;
    this.gateway.emitNewMessage(conversationId);
    void this.draftIntakes.analyzeInboundMessage(messageId).catch((err) =>
      this.logger.error(`Failed to analyze inbound message: ${(err as Error).message}`),
    );
  }

  getStatus() {
    return {
      status: this.channel.getStatus(),
      qr: this.channel.getQrCode(),
      phoneNumber: this.channel.getPhoneNumber(),
    };
  }

  async reconnect(): Promise<ReturnType<MessagingService["getStatus"]>> {
    await this.channel.reconnect();
    return this.getStatus();
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

  private async deliverTrackedMessage(messageId: number, jid: string, text: string): Promise<void> {
    let delivered = false;
    let finalError: unknown;
    for (let retry = 0; retry < 3 && !delivered; retry += 1) {
      const attempt = await this.conversations.startDeliveryAttempt(messageId);
      try {
        const result = await this.channel.sendMessage(jid, text);
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
    await this.deliverTrackedMessage(message.id, message.whatsappJid, message.body);
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

  async startDirectConversation(input: string): Promise<{ id: number }> {
    const phoneNumber = input.replace(/[\s()+.\-]/g, "").replace(/^00/, "");
    if (!/^[1-9]\d{7,14}$/.test(phoneNumber)) {
      throw new BadRequestException(
        "Enter a valid international phone number including the country code",
      );
    }
    if (this.channel.getStatus() !== "connected") {
      throw new ServiceUnavailableException("WhatsApp is not connected");
    }

    const recipient = await this.channel.resolveDirectRecipient(phoneNumber);
    if (!recipient) {
      throw new NotFoundException("This phone number is not registered on WhatsApp");
    }

    const id = await this.conversations.findOrCreateConversation(
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
    await this.deliverTrackedMessage(messageId, conversation.whatsappJid, text);
    if (travelRequestId) {
      const client = await this.pool.connect();
      try {
        await client.query("BEGIN");
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
}
