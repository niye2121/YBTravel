import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { BaileysConnector } from "./baileys.connector";
import { ConversationsService } from "./conversations.service";
import { MESSAGING_CHANNEL } from "./messaging-channel.interface";
import { MessagingController } from "./messaging.controller";
import { MessagingGateway } from "./messaging.gateway";
import { MessagingService } from "./messaging.service";
import { WhatsAppGroupsService } from "./whatsapp-groups.service";

@Module({
  imports: [AuthModule],
  controllers: [MessagingController],
  providers: [
    { provide: MESSAGING_CHANNEL, useClass: BaileysConnector },
    ConversationsService,
    MessagingGateway,
    MessagingService,
    WhatsAppGroupsService,
  ],
})
export class MessagingModule {}
