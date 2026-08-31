import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { RequestWorkflowSettingsController } from "./request-workflow-settings.controller";
import { RequestWorkflowSettingsService } from "./request-workflow-settings.service";

@Module({
  imports: [AuthModule],
  controllers: [RequestWorkflowSettingsController],
  providers: [RequestWorkflowSettingsService],
  exports: [RequestWorkflowSettingsService],
})
export class RequestWorkflowSettingsModule {}
