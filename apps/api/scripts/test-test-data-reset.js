const assert = require("node:assert/strict");
const { SystemSettingsService } = require("../dist/modules/system-settings/system-settings.service");

function makeService(enabled) {
  const queries = [];
  const client = {
    async query(sql, params) {
      queries.push({ sql, params });
      if (sql.includes("SELECT demo_data_enabled") && sql.includes("FOR UPDATE")) {
        return { rows: [{ demo_data_enabled: false, test_data_deletion_enabled: enabled, updated_at: new Date().toISOString() }] };
      }
      if (sql.includes("AS conversations")) {
        return { rows: [{ conversations: 2, messages: 7, groups: 1, requests: 3, clients: 2, travellers: 4, notifications: 5 }] };
      }
      return { rows: [] };
    },
    release() {},
  };
  return { service: new SystemSettingsService({ connect: async () => client }), queries };
}

async function main() {
  const disabled = makeService(false);
  await assert.rejects(
    disabled.service.resetTestData(42),
    (error) => error?.status === 400,
    "reset must be blocked unless the Setup switch is enabled",
  );
  assert.equal(disabled.queries.some(({ sql }) => sql.includes("TRUNCATE TABLE")), false);

  const enabled = makeService(true);
  const result = await enabled.service.resetTestData(42);
  assert.equal(result.deleted.messages, 7);
  const truncate = enabled.queries.find(({ sql }) => sql.includes("TRUNCATE TABLE"))?.sql ?? "";
  assert.match(truncate, /conversations/);
  assert.match(truncate, /clients/);
  assert.match(truncate, /travellers/);
  assert.match(truncate, /staff_notifications/);
  assert.doesNotMatch(truncate, /users|audit_events|system_settings|ai_provider_settings|whatsapp_connections/);
  const settingUpdate = enabled.queries.find(({ sql }) => sql.includes("test_data_deletion_enabled = false"));
  assert.ok(settingUpdate, "reset must automatically disable the one-use switch");
  const audit = enabled.queries.find(({ sql }) => sql.includes("INSERT INTO audit_events"));
  assert.equal(audit?.params?.[1], "system_settings.test_data_reset");
  assert.equal(enabled.queries.at(-1)?.sql, "COMMIT");
  console.log("Test-data reset regression tests passed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
