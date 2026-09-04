import {
  BadGatewayException,
  BadRequestException,
  Inject,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import { loadEnv } from "../../config/env";
import { recordAudit } from "../../database/audit";
import { PG_POOL } from "../../database/database.module";
import { AiUsageService } from "./ai-usage.service";

export type OpenAiModel = "gpt-5.6-luna" | "gpt-5.6-terra" | "gpt-5.6-sol";
export type ReasoningEffort = "none" | "low" | "medium";

export type AiProviderInput = {
  apiKey?: string;
  model: OpenAiModel;
  reasoningEffort: ReasoningEffort;
  maxOutputTokens: number;
  enabled: boolean;
};

export type AiProviderSettings = {
  provider: "openai";
  configured: boolean;
  apiKeyLastFour: string | null;
  model: OpenAiModel;
  reasoningEffort: ReasoningEffort;
  maxOutputTokens: number;
  enabled: boolean;
  humanReviewRequired: true;
  redactSensitiveData: true;
  connectionStatus: "connected" | "not_tested" | "failed";
  lastTestedAt: string | null;
  updatedAt: string | null;
  encryptionReady: boolean;
};

export type ConnectionTestResult = {
  ok: true;
  model: OpenAiModel;
  message: string;
  testedAt: string;
};

type SettingsRow = {
  api_key_ciphertext: string;
  api_key_encryption_key_id: string;
  api_key_last_four: string;
  model: OpenAiModel;
  reasoning_effort: ReasoningEffort;
  max_output_tokens: number;
  enabled: boolean;
  connection_status: "connected" | "not_tested" | "failed";
  last_tested_at: string | null;
  updated_at: string;
};

const DEFAULTS: AiProviderSettings = {
  provider: "openai",
  configured: false,
  apiKeyLastFour: null,
  model: "gpt-5.6-luna",
  reasoningEffort: "low",
  maxOutputTokens: 800,
  enabled: true,
  humanReviewRequired: true,
  redactSensitiveData: true,
  connectionStatus: "not_tested",
  lastTestedAt: null,
  updatedAt: null,
  encryptionReady: false,
};

@Injectable()
export class AiProviderSettingsService {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly usage: AiUsageService,
  ) {}

  private decodeEncryptionKey(encoded: string | undefined): Buffer {
    const value = encoded?.trim();
    if (!value) {
      throw new ServiceUnavailableException(
        "AI secret encryption is not configured on the server. Set AI_SECRETS_ENCRYPTION_KEY first.",
      );
    }
    const key = Buffer.from(value, "base64");
    if (key.length !== 32) {
      throw new ServiceUnavailableException(
        "AI_SECRETS_ENCRYPTION_KEY must be a base64-encoded 32-byte key.",
      );
    }
    return key;
  }

  private encryptionKey(): Buffer {
    return this.decodeEncryptionKey(loadEnv().AI_SECRETS_ENCRYPTION_KEY);
  }

  private decryptionKeys(): Array<{ id: string; key: Buffer }> {
    const previous = (loadEnv().AI_SECRETS_ENCRYPTION_KEY_PREVIOUS ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
      .map((value, index) => ({ id: `previous-${index + 1}`, key: this.decodeEncryptionKey(value) }));
    return [{ id: "primary", key: this.encryptionKey() }, ...previous];
  }

  private encryptionReady(): boolean {
    try {
      this.encryptionKey();
      return true;
    } catch {
      return false;
    }
  }

  private encrypt(value: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.encryptionKey(), iv);
    const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return ["v1", iv.toString("base64"), tag.toString("base64"), ciphertext.toString("base64")].join(".");
  }

  private decrypt(payload: string): string {
    const [version, ivText, tagText, ciphertextText] = payload.split(".");
    if (version !== "v1" || !ivText || !tagText || !ciphertextText) {
      throw new ServiceUnavailableException("The saved AI credential cannot be decrypted.");
    }
    for (const candidate of this.decryptionKeys()) {
      try {
        const decipher = createDecipheriv("aes-256-gcm", candidate.key, Buffer.from(ivText, "base64"));
        decipher.setAuthTag(Buffer.from(tagText, "base64"));
        return Buffer.concat([
          decipher.update(Buffer.from(ciphertextText, "base64")),
          decipher.final(),
        ]).toString("utf8");
      } catch {
        // Try the next explicitly configured rotation key.
      }
    }
    throw new ServiceUnavailableException(
      "The saved AI credential cannot be decrypted with the configured current or previous server keys.",
    );
  }

  private async row(client: Pool | PoolClient = this.pool): Promise<SettingsRow | null> {
    const result = await client.query<SettingsRow>(
      `SELECT api_key_ciphertext, api_key_encryption_key_id, api_key_last_four, model, reasoning_effort,
              max_output_tokens, enabled, connection_status, last_tested_at, updated_at
       FROM ai_provider_settings WHERE id = 1`,
    );
    return result.rows[0] ?? null;
  }

  private sanitize(row: SettingsRow | null): AiProviderSettings {
    if (!row) return { ...DEFAULTS, encryptionReady: this.encryptionReady() };
    return {
      provider: "openai",
      configured: true,
      apiKeyLastFour: row.api_key_last_four.trim(),
      model: row.model,
      reasoningEffort: row.reasoning_effort,
      maxOutputTokens: row.max_output_tokens,
      enabled: row.enabled,
      humanReviewRequired: true,
      redactSensitiveData: true,
      connectionStatus: row.connection_status,
      lastTestedAt: row.last_tested_at,
      updatedAt: row.updated_at,
      encryptionReady: this.encryptionReady(),
    };
  }

  async get(): Promise<AiProviderSettings> {
    return this.sanitize(await this.row());
  }

  private async testKey(
    apiKey: string,
    model: OpenAiModel,
    actorUserId: number,
    purpose: "manual_connection_test" | "save_connection_test",
  ): Promise<ConnectionTestResult> {
    const startedAt = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);
    let response: Response;
    try {
      response = await fetch(`https://api.openai.com/v1/models/${encodeURIComponent(model)}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: controller.signal,
      });
    } catch (error) {
      const errorCode = error instanceof Error && error.name === "AbortError" ? "timeout" : "network_error";
      await this.usage.record({
        operation: "connection_test",
        purpose,
        model,
        status: "failed",
        initiatedBy: actorUserId,
        durationMs: Date.now() - startedAt,
        errorCode,
      });
      if (error instanceof Error && error.name === "AbortError") {
        throw new ServiceUnavailableException("OpenAI did not respond within 12 seconds.");
      }
      throw new BadGatewayException("The server could not reach OpenAI.");
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      await this.usage.record({
        operation: "connection_test",
        purpose,
        model,
        status: "failed",
        initiatedBy: actorUserId,
        durationMs: Date.now() - startedAt,
        errorCode: `http_${response.status}`,
      });
    }
    if (response.status === 401) throw new UnauthorizedException("OpenAI rejected this API key.");
    if (response.status === 403 || response.status === 404) {
      throw new BadRequestException(`This OpenAI project cannot access ${model}.`);
    }
    if (!response.ok) {
      throw new BadGatewayException(`OpenAI connection test failed with status ${response.status}.`);
    }

    const testedAt = new Date().toISOString();
    await this.usage.record({
      operation: "connection_test",
      purpose,
      model,
      status: "succeeded",
      initiatedBy: actorUserId,
      durationMs: Date.now() - startedAt,
    });
    return { ok: true, model, message: `Connected — ${model} is available.`, testedAt };
  }

  async test(apiKey: string | undefined, model: OpenAiModel, actorUserId: number): Promise<ConnectionTestResult> {
    if (apiKey) return this.testKey(apiKey, model, actorUserId, "manual_connection_test");
    const existing = await this.row();
    if (!existing) throw new BadRequestException("Enter an OpenAI API key first.");
    return this.testKey(this.decrypt(existing.api_key_ciphertext), model, actorUserId, "manual_connection_test");
  }

  async save(input: AiProviderInput, actorUserId: number): Promise<AiProviderSettings> {
    const existing = await this.row();
    if (!input.apiKey && !existing) throw new BadRequestException("Enter an OpenAI API key first.");
    const apiKey = input.apiKey ?? this.decrypt(existing!.api_key_ciphertext);
    const testResult = await this.testKey(apiKey, input.model, actorUserId, "save_connection_test");
    const ciphertext = this.encrypt(apiKey);
    const lastFour = input.apiKey ? input.apiKey.slice(-4) : existing!.api_key_last_four;

    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const before = this.sanitize(await this.row(client));
      await client.query(
        `INSERT INTO ai_provider_settings
           (id, provider, api_key_ciphertext, api_key_encryption_key_id, api_key_last_four, model,
            reasoning_effort, max_output_tokens, enabled, connection_status,
            last_tested_at, created_by, updated_by)
         VALUES (1, 'openai', $1, 'primary', $2, $3, $4, $5, $6, 'connected', $7, $8, $8)
         ON CONFLICT (id) DO UPDATE SET
           api_key_ciphertext = EXCLUDED.api_key_ciphertext,
           api_key_encryption_key_id = EXCLUDED.api_key_encryption_key_id,
           api_key_last_four = EXCLUDED.api_key_last_four,
           model = EXCLUDED.model,
           reasoning_effort = EXCLUDED.reasoning_effort,
           max_output_tokens = EXCLUDED.max_output_tokens,
           enabled = EXCLUDED.enabled,
           connection_status = 'connected',
           last_tested_at = EXCLUDED.last_tested_at,
           updated_by = EXCLUDED.updated_by,
           updated_at = now()`,
        [ciphertext, lastFour, input.model, input.reasoningEffort, input.maxOutputTokens,
         input.enabled, testResult.testedAt, actorUserId],
      );
      const after = this.sanitize(await this.row(client));
      await recordAudit(client, actorUserId, "ai_provider_settings.updated", "ai_provider_settings", 1, before, after);
      await client.query("COMMIT");
      return after;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async rotateStoredCredential(actorUserId: number): Promise<AiProviderSettings> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const existing = await this.row(client);
      if (!existing) throw new BadRequestException("The AI provider is not configured.");
      const before = this.sanitize(existing);
      const plaintext = this.decrypt(existing.api_key_ciphertext);
      await client.query(
        `UPDATE ai_provider_settings
         SET api_key_ciphertext = $1, api_key_encryption_key_id = 'primary',
             updated_by = $2, updated_at = now()
         WHERE id = 1`,
        [this.encrypt(plaintext), actorUserId],
      );
      const after = this.sanitize(await this.row(client));
      await recordAudit(client, actorUserId, "ai_provider_settings.secret_rotated", "ai_provider_settings", 1, before, after);
      await client.query("COMMIT");
      return after;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async getRuntimeConfiguration(): Promise<{
    apiKey: string;
    model: OpenAiModel;
    reasoningEffort: ReasoningEffort;
    maxOutputTokens: number;
  }> {
    const settings = await this.row();
    if (!settings || !settings.enabled) {
      throw new ServiceUnavailableException("The AI provider is not configured and enabled.");
    }
    return {
      apiKey: this.decrypt(settings.api_key_ciphertext),
      model: settings.model,
      reasoningEffort: settings.reasoning_effort,
      maxOutputTokens: settings.max_output_tokens,
    };
  }
}
