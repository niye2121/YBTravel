import { BadGatewayException, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { AiProviderSettingsService } from "./ai-provider-settings.service";
import { AiUsageService } from "./ai-usage.service";

type OpenAiUsage = {
  input_tokens?: number;
  input_tokens_details?: { cached_tokens?: number };
  output_tokens?: number;
  total_tokens?: number;
};

type OpenAiResponse = {
  id?: string;
  status?: string;
  output_text?: string;
  output?: Array<{
    content?: Array<{ type?: string; text?: string }>;
  }>;
  usage?: OpenAiUsage;
  error?: { code?: string; message?: string } | null;
};

export type CreateAiResponseInput = {
  purpose: string;
  input: string;
  instructions?: string;
  initiatedBy?: number;
  relatedEntityType?: string;
  relatedEntityId?: string | number;
  responseFormat?: { name: string; schema: Record<string, unknown> };
};

/**
 * Provider-neutral callers should enter through this service instead of using
 * fetch directly. That makes the local usage ledger complete by construction.
 */
@Injectable()
export class OpenAiClientService {
  constructor(
    private readonly settings: AiProviderSettingsService,
    private readonly usage: AiUsageService,
  ) {}

  async createTextResponse(input: CreateAiResponseInput): Promise<{ responseId: string; text: string }> {
    const configuration = await this.settings.getRuntimeConfiguration();
    const startedAt = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45_000);
    let response: Response;

    try {
      response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${configuration.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: configuration.model,
          input: input.input,
          ...(input.instructions ? { instructions: input.instructions } : {}),
          reasoning: { effort: configuration.reasoningEffort },
          max_output_tokens: configuration.maxOutputTokens,
          ...(input.responseFormat
            ? {
                text: {
                  format: {
                    type: "json_schema",
                    name: input.responseFormat.name,
                    strict: true,
                    schema: input.responseFormat.schema,
                  },
                },
              }
            : {}),
          store: false,
          metadata: {
            yb_purpose: input.purpose.slice(0, 512),
            ...(input.relatedEntityType ? { yb_entity_type: input.relatedEntityType.slice(0, 512) } : {}),
            ...(input.relatedEntityId == null ? {} : { yb_entity_id: String(input.relatedEntityId).slice(0, 512) }),
          },
        }),
        signal: controller.signal,
      });
    } catch (error) {
      await this.usage.record({
        operation: "generation",
        purpose: input.purpose,
        model: configuration.model,
        status: "failed",
        initiatedBy: input.initiatedBy,
        relatedEntityType: input.relatedEntityType,
        relatedEntityId: input.relatedEntityId,
        durationMs: Date.now() - startedAt,
        errorCode: error instanceof Error && error.name === "AbortError" ? "timeout" : "network_error",
      });
      if (error instanceof Error && error.name === "AbortError") {
        throw new ServiceUnavailableException("OpenAI did not respond within 45 seconds.");
      }
      throw new BadGatewayException("The server could not reach OpenAI.");
    } finally {
      clearTimeout(timeout);
    }

    let body: OpenAiResponse = {};
    try {
      body = await response.json() as OpenAiResponse;
    } catch {
      // The HTTP status is still recorded below even when the body is invalid.
    }
    const usage = body.usage;
    const commonUsage = {
      providerResponseId: body.id ?? null,
      initiatedBy: input.initiatedBy,
      relatedEntityType: input.relatedEntityType,
      relatedEntityId: input.relatedEntityId,
      inputTokens: usage?.input_tokens ?? 0,
      cachedInputTokens: usage?.input_tokens_details?.cached_tokens ?? 0,
      outputTokens: usage?.output_tokens ?? 0,
      totalTokens: usage?.total_tokens ?? 0,
      durationMs: Date.now() - startedAt,
    };

    if (!response.ok || body.status === "failed" || body.error) {
      await this.usage.record({
        operation: "generation",
        purpose: input.purpose,
        model: configuration.model,
        status: "failed",
        ...commonUsage,
        errorCode: body.error?.code ?? `http_${response.status}`,
      });
      throw new BadGatewayException(body.error?.message ?? `OpenAI request failed with status ${response.status}.`);
    }

    await this.usage.record({
      operation: "generation",
      purpose: input.purpose,
      model: configuration.model,
      status: "succeeded",
      ...commonUsage,
    });
    const text = body.output_text
      ?? body.output?.flatMap((item) => item.content ?? []).find((item) => item.type === "output_text")?.text
      ?? "";
    return { responseId: body.id ?? "", text };
  }
}
