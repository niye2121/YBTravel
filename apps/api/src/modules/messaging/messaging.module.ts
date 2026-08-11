import { Module } from "@nestjs/common";
import { BaileysConnector } from "./baileys.connector";
import { ConversationsService } from "./conversations.service";
import { MESSAGING_CHANNEL } from "./messaging-channel.interface";
import { MessagingController } from "./messaging.controller";
import { MessagingGateway } from "./messaging.gateway";
import { MessagingService } from "./messaging.service";

@Module({
  controllers: [MessagingController],
  providers: [
    { provide: MESSAGING_CHANNEL, useClass: BaileysConnector },
    ConversationsService,
    MessagingGateway,
    MessagingService,
  ],
})
export class MessagingModule {}
