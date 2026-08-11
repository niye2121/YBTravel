import { Module } from "@nestjs/common";
import { AuthModule } from "./modules/auth/auth.module";
import { ClientsModule } from "./modules/clients/clients.module";
import { MessagingModule } from "./modules/messaging/messaging.module";
import { RequestsModule } from "./modules/requests/requests.module";
import { DatabaseModule } from "./database/database.module";
import { HealthModule } from "./health/health.module";

@Module({
  imports: [
    DatabaseModule,
    HealthModule,
    ClientsModule,
    RequestsModule,
    AuthModule,
    MessagingModule,
  ],
})
export class AppModule {}
