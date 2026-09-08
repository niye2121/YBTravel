import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import type { Pool } from "pg";
import { recordAudit } from "../../database/audit";
import { PG_POOL } from "../../database/database.module";

export type SystemSettings = {
  demoDataEnabled: boolean;
  testDataDeletionEnabled: boolean;
  updatedAt: string;
};

type SystemSettingsRow = {
  demo_data_enabled: boolean;
  test_data_deletion_enabled: boolean;
  updated_at: string;
};

export type TestDataResetResult = {
  deleted: {
    conversations: number;
    messages: number;
    groups: number;
    requests: number;
    clients: number;
    travellers: number;
    notifications: number;
  };
};

function toSystemSettings(row: SystemSettingsRow): SystemSettings {
  return {
    demoDataEnabled: row.demo_data_enabled,
    testDataDeletionEnabled: row.test_data_deletion_enabled,
    updatedAt: row.updated_at,
  };
}

@Injectable()
export class SystemSettingsService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async get(): Promise<SystemSettings> {
    const result = await this.pool.query<SystemSettingsRow>(
      `SELECT demo_data_enabled, test_data_deletion_enabled, updated_at
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
        `SELECT demo_data_enabled, test_data_deletion_enabled, updated_at
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
         RETURNING demo_data_enabled, test_data_deletion_enabled, updated_at`,
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

  async updateTestDataDeletion(
    testDataDeletionEnabled: boolean,
    actorUserId: number,
  ): Promise<SystemSettings> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const beforeResult = await client.query<SystemSettingsRow>(
        `SELECT demo_data_enabled, test_data_deletion_enabled, updated_at
         FROM system_settings WHERE id = 1 FOR UPDATE`,
      );
      const beforeRow = beforeResult.rows[0];
      if (!beforeRow) throw new Error("System settings are not initialized");
      const result = await client.query<SystemSettingsRow>(
        `UPDATE system_settings
         SET test_data_deletion_enabled = $1, updated_by = $2, updated_at = now()
         WHERE id = 1
         RETURNING demo_data_enabled, test_data_deletion_enabled, updated_at`,
        [testDataDeletionEnabled, actorUserId],
      );
      const row = result.rows[0];
      if (!row) throw new Error("Failed to update system settings");
      const before = toSystemSettings(beforeRow);
      const after = toSystemSettings(row);
      await recordAudit(
        client,
        actorUserId,
        "system_settings.test_data_deletion_updated",
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

  async resetTestData(actorUserId: number): Promise<TestDataResetResult> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const settingsResult = await client.query<SystemSettingsRow>(
        `SELECT demo_data_enabled, test_data_deletion_enabled, updated_at
         FROM system_settings WHERE id = 1 FOR UPDATE`,
      );
      const settings = settingsResult.rows[0];
      if (!settings?.test_data_deletion_enabled) {
        throw new BadRequestException("Enable test data deletion in Setup before using this action");
      }

      const countsResult = await client.query<{
        conversations: number; messages: number; groups: number; requests: number;
        clients: number; travellers: number; notifications: number;
      }>(`SELECT
          (SELECT count(*)::int FROM conversations) AS conversations,
          (SELECT count(*)::int FROM messages) AS messages,
          (SELECT count(*)::int FROM whatsapp_groups) AS groups,
          (SELECT count(*)::int FROM travel_requests) AS requests,
          (SELECT count(*)::int FROM clients) AS clients,
          (SELECT count(*)::int FROM travellers) AS travellers,
          (SELECT count(*)::int FROM staff_notifications) AS notifications`);
      const deleted = countsResult.rows[0] ?? {
        conversations: 0, messages: 0, groups: 0, requests: 0,
        clients: 0, travellers: 0, notifications: 0,
      };

      // These are operational roots. CASCADE clears their dependent messages,
      // drafts, requests, group participants, traveller links, and assignment
      // events without touching users, configuration, audit/security records,
      // AI credentials/usage, or the WhatsApp connection and auth session.
      await client.query(
        `TRUNCATE TABLE conversations, clients, travellers, staff_notifications, staff_reminders,
                        supervisor_review_items
         RESTART IDENTITY CASCADE`,
      );
      await client.query(
        `UPDATE system_settings
         SET demo_data_enabled = false, test_data_deletion_enabled = false,
             updated_by = $1, updated_at = now()
         WHERE id = 1`,
        [actorUserId],
      );
      await recordAudit(
        client,
        actorUserId,
        "system_settings.test_data_reset",
        "system_settings",
        1,
        { testDataDeletionEnabled: true },
        { testDataDeletionEnabled: false, deleted },
      );
      await client.query("COMMIT");
      return { deleted };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}
