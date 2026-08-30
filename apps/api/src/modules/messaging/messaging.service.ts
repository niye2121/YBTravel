import { Inject, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConversationsService } from "./conversations.service";
import { MESSAGING_CHANNEL, type InboundMessage, type MessagingChannel } from "./messaging-channel.interface";
import { MessagingGateway } from "./messaging.gateway";

@Injectable()
export class MessagingService implements OnModuleInit {
  private readonly logger = new Logger(MessagingService.name);

  constructor(
    @Inject(MESSAGING_CHANNEL) private readonly channel: MessagingChannel,
    private readonly conversations: ConversationsService,
    private readonly gateway: MessagingGateway,
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
    await this.conversations.appendMessage(conversationId, "inbound", message.body, message.senderJid);
    this.gateway.emitNewMessage(conversationId);
  }

  getStatus() {
    return {
      status: this.channel.getStatus(),
      qr: this.channel.getQrCode(),
      phoneNumber: this.channel.getPhoneNumber(),
    };
  }

  listConversations() {
    return this.conversations.listConversations();
  }

  listMessages(conversationId: number) {
    return this.conversations.listMessages(conversationId);
  }

  async sendReply(conversationId: number, text: string): Promise<void> {
    const conversation = await this.conversations.getConversation(conversationId);
    if (!conversation) throw new Error("Conversation not found");
    await this.channel.sendMessage(conversation.whatsappJid, text);
    await this.conversations.appendMessage(conversationId, "outbound", text, "me");
    this.gateway.emitNewMessage(conversationId);
  }
}
