import { Module } from "@nestjs/common";
import { AuthModule } from "./modules/auth/auth.module";
import { BookingFeesModule } from "./modules/booking-fees/booking-fees.module";
import { ClientsModule } from "./modules/clients/clients.module";
import { MessagingModule } from "./modules/messaging/messaging.module";
import { RequestsModule } from "./modules/requests/requests.module";
import { TravellersModule } from "./modules/travellers/travellers.module";
import { UsersModule } from "./modules/users/users.module";
import { WorkflowSettingsModule } from "./modules/workflow-settings/workflow-settings.module";
import { DatabaseModule } from "./database/database.module";
import { HealthModule } from "./health/health.module";

@Module({
  imports: [
    DatabaseModule,
    HealthModule,
    ClientsModule,
    TravellersModule,
    RequestsModule,
    AuthModule,
    BookingFeesModule,
    UsersModule,
    MessagingModule,
    WorkflowSettingsModule,
  ],
})
export class AppModule {}
