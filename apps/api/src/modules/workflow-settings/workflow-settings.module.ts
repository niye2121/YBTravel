import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { WorkflowSettingsController } from "./workflow-settings.controller";
import { WorkflowSettingsService } from "./workflow-settings.service";

@Module({
  imports: [AuthModule],
  controllers: [WorkflowSettingsController],
  providers: [WorkflowSettingsService],
})
export class WorkflowSettingsModule {}
