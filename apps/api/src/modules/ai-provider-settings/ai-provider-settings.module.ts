import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AiProviderSettingsController } from "./ai-provider-settings.controller";
import { AiProviderSettingsService } from "./ai-provider-settings.service";
import { AiUsageService } from "./ai-usage.service";
import { OpenAiClientService } from "./openai-client.service";

@Module({
  imports: [AuthModule],
  controllers: [AiProviderSettingsController],
  providers: [AiUsageService, AiProviderSettingsService, OpenAiClientService],
  exports: [AiProviderSettingsService, AiUsageService, OpenAiClientService],
})
export class AiProviderSettingsModule {}
