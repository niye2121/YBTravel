import { Module } from "@nestjs/common";
import { AuthModule } from "./modules/auth/auth.module";
import { BookingFeesModule } from "./modules/booking-fees/booking-fees.module";
import { ClientsModule } from "./modules/clients/clients.module";
import { MessagingModule } from "./modules/messaging/messaging.module";
import { RequestsModule } from "./modules/requests/requests.module";
import { RequestWorkflowSettingsModule } from "./modules/request-workflow-settings/request-workflow-settings.module";
import { TravellersModule } from "./modules/travellers/travellers.module";
import { UsersModule } from "./modules/users/users.module";
import { WorkflowSettingsModule } from "./modules/workflow-settings/workflow-settings.module";
import { AiProviderSettingsModule } from "./modules/ai-provider-settings/ai-provider-settings.module";
import { SystemSettingsModule } from "./modules/system-settings/system-settings.module";
import { AssignmentRoutingModule } from "./modules/assignment-routing/assignment-routing.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { MessageTemplatesModule } from "./modules/message-templates/message-templates.module";
import { DatabaseModule } from "./database/database.module";
import { HealthModule } from "./health/health.module";

@Module({
  imports: [
    DatabaseModule,
    HealthModule,
    ClientsModule,
    TravellersModule,
    RequestsModule,
    RequestWorkflowSettingsModule,
    AuthModule,
    BookingFeesModule,
    UsersModule,
    MessagingModule,
    WorkflowSettingsModule,
    AiProviderSettingsModule,
    SystemSettingsModule,
    AssignmentRoutingModule,
    NotificationsModule,
    MessageTemplatesModule,
  ],
})
export class AppModule {}
