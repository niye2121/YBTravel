import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AiProviderSettingsModule } from "../ai-provider-settings/ai-provider-settings.module";
import { RequestsModule } from "../requests/requests.module";
import { BaileysConnector } from "./baileys.connector";
import { ConversationsService } from "./conversations.service";
import { MESSAGING_CHANNEL } from "./messaging-channel.interface";
import { MessagingController } from "./messaging.controller";
import { MessagingGateway } from "./messaging.gateway";
import { MessagingService } from "./messaging.service";
import { WhatsAppGroupsService } from "./whatsapp-groups.service";
import { DraftIntakesService } from "./draft-intakes.service";
import { VoiceNoteTranscoder } from "./voice-note-transcoder";

@Module({
  imports: [AuthModule, AiProviderSettingsModule, RequestsModule],
  controllers: [MessagingController],
  providers: [
    { provide: MESSAGING_CHANNEL, useClass: BaileysConnector },
    ConversationsService,
    MessagingGateway,
    MessagingService,
    WhatsAppGroupsService,
    DraftIntakesService,
    VoiceNoteTranscoder,
  ],
})
export class MessagingModule {}
