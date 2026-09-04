import { Inject, Injectable } from "@nestjs/common";
import type { Pool } from "pg";
import { PG_POOL } from "../../database/database.module";
import type { OpenAiModel } from "./ai-provider-settings.service";

export type AiUsageStatus = "succeeded" | "failed";
export type AiUsageOperation = "connection_test" | "generation";

export type AiUsageWrite = {
  operation: AiUsageOperation;
  purpose: string;
  model: OpenAiModel;
  status: AiUsageStatus;
  providerResponseId?: string | null;
  initiatedBy?: number | null;
  relatedEntityType?: string | null;
  relatedEntityId?: string | number | null;
  inputTokens?: number;
  cachedInputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  durationMs?: number;
  errorCode?: string | null;
};

export type AiUsageEvent = {
  id: string;
  operation: AiUsageOperation;
  purpose: string;
  model: string;
  status: AiUsageStatus;
  providerResponseId: string | null;
  initiatedByName: string | null;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUsd: string;
  durationMs: number | null;
  errorCode: string | null;
  createdAt: string;
};

export type AiUsageReport = {
  periodDays: number | null;
  summary: {
    requestCount: number;
    successfulCount: number;
    failedCount: number;
    inputTokens: number;
    cachedInputTokens: number;
    outputTokens: number;
    totalTokens: number;
    estimatedCostUsd: string;
  };
  events: AiUsageEvent[];
  pricingNote: string;
};

type Price = {
  input: string;
  cachedInput: string;
  output: string;
  inputNanosPerToken: bigint;
  cachedInputNanosPerToken: bigint;
  outputNanosPerToken: bigint;
};

const PRICES: Record<OpenAiModel, Price> = {
  "gpt-5.6-luna": {
    input: "0.200000",
    cachedInput: "0.020000",
    output: "1.200000",
    inputNanosPerToken: 200n,
    cachedInputNanosPerToken: 20n,
    outputNanosPerToken: 1200n,
  },
  "gpt-5.6-terra": {
    input: "2.000000",
    cachedInput: "0.200000",
    output: "12.000000",
    inputNanosPerToken: 2000n,
    cachedInputNanosPerToken: 200n,
    outputNanosPerToken: 12000n,
  },
  "gpt-5.6-sol": {
    input: "4.000000",
    cachedInput: "0.400000",
    output: "20.000000",
    inputNanosPerToken: 4000n,
    cachedInputNanosPerToken: 400n,
    outputNanosPerToken: 20000n,
  },
};

function nonNegativeInteger(value: number | undefined): number {
  if (!Number.isSafeInteger(value) || (value ?? 0) < 0) return 0;
  return value ?? 0;
}

function nanosToUsd(nanos: bigint): string {
  const whole = nanos / 1_000_000_000n;
  const fraction = (nanos % 1_000_000_000n).toString().padStart(9, "0");
  return `${whole}.${fraction}`;
}

export function calculateEstimatedCostUsd(
  model: OpenAiModel,
  inputTokensValue: number,
  cachedInputTokensValue: number,
  outputTokensValue: number,
): string {
  const price = PRICES[model];
  const inputTokens = BigInt(nonNegativeInteger(inputTokensValue));
  const cachedTokens = BigInt(Math.min(nonNegativeInteger(cachedInputTokensValue), Number(inputTokens)));
  const uncachedTokens = inputTokens - cachedTokens;
  const outputTokens = BigInt(nonNegativeInteger(outputTokensValue));

  let inputMultiplier = 1n;
  let outputNumerator = 1n;
  let outputDenominator = 1n;
  if (inputTokens > 272_000n) {
    inputMultiplier = 2n;
    outputNumerator = 3n;
    outputDenominator = 2n;
  }

  const inputNanos = (
    uncachedTokens * price.inputNanosPerToken
    + cachedTokens * price.cachedInputNanosPerToken
  ) * inputMultiplier;
  const outputNanos = outputTokens * price.outputNanosPerToken * outputNumerator / outputDenominator;
  return nanosToUsd(inputNanos + outputNanos);
}

type UsageRow = {
  id: string;
  operation: AiUsageOperation;
  purpose: string;
  model: string;
  status: AiUsageStatus;
  provider_response_id: string | null;
  initiated_by_name: string | null;
  related_entity_type: string | null;
  related_entity_id: string | null;
  input_tokens: string;
  cached_input_tokens: string;
  output_tokens: string;
  total_tokens: string;
  estimated_cost_usd: string;
  duration_ms: number | null;
  error_code: string | null;
  created_at: string;
};

@Injectable()
export class AiUsageService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async record(input: AiUsageWrite): Promise<void> {
    const price = PRICES[input.model];
    const inputTokens = nonNegativeInteger(input.inputTokens);
    const cachedInputTokens = Math.min(nonNegativeInteger(input.cachedInputTokens), inputTokens);
    const outputTokens = nonNegativeInteger(input.outputTokens);
    const totalTokens = nonNegativeInteger(input.totalTokens) || inputTokens + outputTokens;
    const estimatedCostUsd = calculateEstimatedCostUsd(
      input.model,
      inputTokens,
      cachedInputTokens,
      outputTokens,
    );

    await this.pool.query(
      `INSERT INTO ai_usage_events
         (provider, operation, purpose, model, status, provider_response_id,
          initiated_by, related_entity_type, related_entity_id, input_tokens,
          cached_input_tokens, output_tokens, total_tokens,
          input_price_per_million_usd, cached_input_price_per_million_usd,
          output_price_per_million_usd, estimated_cost_usd, duration_ms, error_code)
       VALUES
         ('openai', $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
          $13, $14, $15, $16, $17, $18)`,
      [
        input.operation,
        input.purpose,
        input.model,
        input.status,
        input.providerResponseId ?? null,
        input.initiatedBy ?? null,
        input.relatedEntityType ?? null,
        input.relatedEntityId == null ? null : String(input.relatedEntityId),
        inputTokens,
        cachedInputTokens,
        outputTokens,
        totalTokens,
        price.input,
        price.cachedInput,
        price.output,
        estimatedCostUsd,
        input.durationMs ?? null,
        input.errorCode ?? null,
      ],
    );
  }

  async report(periodDays: number | null): Promise<AiUsageReport> {
    const periodClause = periodDays == null ? "" : "WHERE e.created_at >= now() - ($1::int * interval '1 day')";
    const values = periodDays == null ? [] : [periodDays];
    const summaryResult = await this.pool.query<{
      request_count: number;
      successful_count: number;
      failed_count: number;
      input_tokens: string;
      cached_input_tokens: string;
      output_tokens: string;
      total_tokens: string;
      estimated_cost_usd: string;
    }>(
      `SELECT COUNT(*)::int AS request_count,
              COUNT(*) FILTER (WHERE status = 'succeeded')::int AS successful_count,
              COUNT(*) FILTER (WHERE status = 'failed')::int AS failed_count,
              COALESCE(SUM(input_tokens), 0)::text AS input_tokens,
              COALESCE(SUM(cached_input_tokens), 0)::text AS cached_input_tokens,
              COALESCE(SUM(output_tokens), 0)::text AS output_tokens,
              COALESCE(SUM(total_tokens), 0)::text AS total_tokens,
              COALESCE(SUM(estimated_cost_usd), 0)::text AS estimated_cost_usd
       FROM ai_usage_events e ${periodClause}`,
      values,
    );
    const eventsResult = await this.pool.query<UsageRow>(
      `SELECT e.id::text, e.operation, e.purpose, e.model, e.status,
              e.provider_response_id, u.name AS initiated_by_name,
              e.related_entity_type, e.related_entity_id,
              e.input_tokens::text, e.cached_input_tokens::text,
              e.output_tokens::text, e.total_tokens::text,
              e.estimated_cost_usd::text, e.duration_ms, e.error_code,
              e.created_at
       FROM ai_usage_events e
       LEFT JOIN users u ON u.id = e.initiated_by
       ${periodClause}
       ORDER BY e.created_at DESC
       LIMIT 100`,
      values,
    );
    const summary = summaryResult.rows[0]!;
    return {
      periodDays,
      summary: {
        requestCount: summary.request_count,
        successfulCount: summary.successful_count,
        failedCount: summary.failed_count,
        inputTokens: Number(summary.input_tokens),
        cachedInputTokens: Number(summary.cached_input_tokens),
        outputTokens: Number(summary.output_tokens),
        totalTokens: Number(summary.total_tokens),
        estimatedCostUsd: summary.estimated_cost_usd,
      },
      events: eventsResult.rows.map((row) => ({
        id: row.id,
        operation: row.operation,
        purpose: row.purpose,
        model: row.model,
        status: row.status,
        providerResponseId: row.provider_response_id,
        initiatedByName: row.initiated_by_name,
        relatedEntityType: row.related_entity_type,
        relatedEntityId: row.related_entity_id,
        inputTokens: Number(row.input_tokens),
        cachedInputTokens: Number(row.cached_input_tokens),
        outputTokens: Number(row.output_tokens),
        totalTokens: Number(row.total_tokens),
        estimatedCostUsd: row.estimated_cost_usd,
        durationMs: row.duration_ms,
        errorCode: row.error_code,
        createdAt: row.created_at,
      })),
      pricingNote: "Estimated from recorded token usage and the saved model price snapshot. OpenAI billing is authoritative.",
    };
  }
}
