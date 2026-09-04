import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { ClientsController } from "./clients.controller";
import { ClientsService } from "./clients.service";
import { OnboardingService } from "./onboarding.service";

@Module({
  imports: [AuthModule],
  controllers: [ClientsController],
  providers: [ClientsService, OnboardingService],
  exports: [OnboardingService],
})
export class ClientsModule {}
