import { BadRequestException, Body, Controller, Get, Post, Put, Query, Req, UseGuards } from "@nestjs/common";
import { z, ZodError } from "zod";
import { AdminGuard } from "../auth/admin.guard";
import { AuthGuard, type AuthenticatedRequest } from "../auth/auth.guard";
import {
  AiProviderSettingsService,
  type AiProviderInput,
  type AiProviderSettings,
  type ConnectionTestResult,
} from "./ai-provider-settings.service";
import { AiUsageService, type AiUsageReport } from "./ai-usage.service";

const modelSchema = z.enum(["gpt-5.6-luna", "gpt-5.6-terra", "gpt-5.6-sol"]);
const apiKeySchema = z.string().trim().min(20, "Enter a valid OpenAI project API key").max(300).startsWith("sk-", "OpenAI API keys start with sk-");
const settingsSchema = z.object({
  apiKey: apiKeySchema.optional(),
  model: modelSchema,
  reasoningEffort: z.enum(["none", "low", "medium"]),
  maxOutputTokens: z.number().int().min(100).max(4000),
  enabled: z.boolean(),
});
const testSchema = z.object({ apiKey: apiKeySchema.optional(), model: modelSchema });

function parse<T>(schema: z.ZodType<T>, body: unknown): T {
  try {
    return schema.parse(body);
  } catch (error) {
    if (error instanceof ZodError) throw new BadRequestException(error.flatten().fieldErrors);
    throw error;
  }
}

@Controller("ai-provider-settings")
@UseGuards(AuthGuard, AdminGuard)
export class AiProviderSettingsController {
  constructor(
    private readonly service: AiProviderSettingsService,
    private readonly usage: AiUsageService,
  ) {}

  @Get()
  get(): Promise<AiProviderSettings> {
    return this.service.get();
  }

  @Post("test")
  test(@Req() request: AuthenticatedRequest, @Body() body: unknown): Promise<ConnectionTestResult> {
    const input = parse(testSchema, body);
    return this.service.test(input.apiKey, input.model, request.user.id);
  }

  @Post("rotate-secret")
  rotateSecret(@Req() request: AuthenticatedRequest): Promise<AiProviderSettings> {
    return this.service.rotateStoredCredential(request.user.id);
  }

  @Get("usage")
  usageReport(@Query("days") daysValue?: string): Promise<AiUsageReport> {
    if (daysValue == null || daysValue === "all") return this.usage.report(null);
    const days = Number(daysValue);
    if (!Number.isInteger(days) || days < 1 || days > 3650) {
      throw new BadRequestException("days must be a whole number between 1 and 3650, or all");
    }
    return this.usage.report(days);
  }

  @Put()
  save(
    @Req() request: AuthenticatedRequest,
    @Body() body: unknown,
  ): Promise<AiProviderSettings> {
    return this.service.save(parse(settingsSchema, body) as AiProviderInput, request.user.id);
  }
}
