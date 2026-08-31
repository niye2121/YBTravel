import { Inject, Injectable } from "@nestjs/common";
import type { Pool } from "pg";
import { recordAudit } from "../../database/audit";
import { PG_POOL } from "../../database/database.module";

export type SystemSettings = {
  demoDataEnabled: boolean;
  updatedAt: string;
};

type SystemSettingsRow = {
  demo_data_enabled: boolean;
  updated_at: string;
};

function toSystemSettings(row: SystemSettingsRow): SystemSettings {
  return {
    demoDataEnabled: row.demo_data_enabled,
    updatedAt: row.updated_at,
  };
}

@Injectable()
export class SystemSettingsService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async get(): Promise<SystemSettings> {
    const result = await this.pool.query<SystemSettingsRow>(
      `SELECT demo_data_enabled, updated_at
       FROM system_settings
       WHERE id = 1`,
    );
    const row = result.rows[0];
    if (!row) throw new Error("System settings are not initialized");
    return toSystemSettings(row);
  }

  async updateDemoData(demoDataEnabled: boolean, actorUserId: number): Promise<SystemSettings> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const beforeResult = await client.query<SystemSettingsRow>(
        `SELECT demo_data_enabled, updated_at
         FROM system_settings
         WHERE id = 1
         FOR UPDATE`,
      );
      const beforeRow = beforeResult.rows[0];
      if (!beforeRow) throw new Error("System settings are not initialized");

      const result = await client.query<SystemSettingsRow>(
        `UPDATE system_settings
         SET demo_data_enabled = $1, updated_by = $2, updated_at = now()
         WHERE id = 1
         RETURNING demo_data_enabled, updated_at`,
        [demoDataEnabled, actorUserId],
      );
      const row = result.rows[0];
      if (!row) throw new Error("Failed to update system settings");
      const before = toSystemSettings(beforeRow);
      const after = toSystemSettings(row);
      await recordAudit(
        client,
        actorUserId,
        "system_settings.demo_data_updated",
        "system_settings",
        1,
        before,
        after,
      );
      await client.query("COMMIT");
      return after;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}
