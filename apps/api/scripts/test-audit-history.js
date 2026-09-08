const assert = require("node:assert/strict");
const path = require("node:path");
const dotenv = require("dotenv");
const { Pool } = require("pg");
const { UsersService } = require("../dist/modules/users/users.service");
const { backendPermissionsForRoles } = require("../dist/modules/auth/permissions");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

/** Calls the running local API with an authenticated JSON request. */
async function callApi(pathname, token, init = {}) {
  return fetch(`http://127.0.0.1:3001${pathname}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
}

/** Logs in one disposable employee and returns their bearer token. */
async function login(email, password) {
  const response = await fetch("http://127.0.0.1:3001/auth/login", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }),
  });
  assert.equal(response.status, 201);
  return (await response.json()).token;
}

/** Proves audit authorization, filtering, unified access events, and secret redaction. */
async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const stamp = Date.now();
  const ids = { administrator: null, agent: null, audit: null, access: null };
  try {
    const seed = await pool.query("SELECT id FROM users WHERE active = true ORDER BY id LIMIT 1");
    const seedActorId = seed.rows[0]?.id;
    assert.ok(seedActorId, "A local user seed is required");
    const users = new UsersService(pool);
    const profile = { active: true, availabilityStatus: "available", capacityLimit: 10, highPriorityCapacityLimit: 12,
      timezone: "America/New_York", workdays: [1, 2, 3, 4, 5], workdayStart: "08:00", workdayEnd: "18:00", eligibleRequestTypeIds: [] };
    const adminEmail = `audit-admin-${stamp}@example.test`;
    const agentEmail = `audit-agent-${stamp}@example.test`;
    const password = `Audit-${stamp}!`;
    const administrator = await users.create({ name: "Audit Administrator", email: adminEmail, phoneNumber: `+1560${String(stamp).slice(-7)}`,
      password, roles: ["system_administrator"], permissions: backendPermissionsForRoles(["system_administrator"]), ...profile }, seedActorId);
    ids.administrator = administrator.id;
    const agent = await users.create({ name: "Audit Agent", email: agentEmail, phoneNumber: `+1561${String(stamp).slice(-7)}`,
      password, roles: ["travel_agent"], permissions: backendPermissionsForRoles(["travel_agent"]), ...profile }, seedActorId);
    ids.agent = agent.id;

    const action = `audit_test.secret_changed.${stamp}`;
    const entityId = `fixture-${stamp}`;
    const event = await pool.query(
      `INSERT INTO audit_events (actor_user_id, action, entity_type, entity_id, before_state, after_state)
       VALUES ($1, $2, 'audit_fixture', $3, $4::jsonb, $5::jsonb) RETURNING id`,
      [agent.id, action, entityId, JSON.stringify({ displayName: "Before", authKey: "old-private-value" }),
        JSON.stringify({ displayName: "After", authKey: "new-private-value", nested: { password: "never-return-this" } })],
    );
    ids.audit = event.rows[0].id;
    const access = await pool.query(
      `INSERT INTO sensitive_access_events
         (actor_user_id, resource_type, resource_id, action, fields_accessed, purpose)
       VALUES ($1, 'traveller', $2, 'view', ARRAY['passport_number'], 'Audit integration test') RETURNING id`,
      [agent.id, entityId],
    );
    ids.access = access.rows[0].id;

    const adminToken = await login(adminEmail, password);
    const agentToken = await login(agentEmail, password);
    assert.equal((await callApi("/audit-history", agentToken)).status, 403);

    const filtered = await callApi(`/audit-history?action=${encodeURIComponent(action)}&actorUserId=${agent.id}&importantOnly=true&page=1`, adminToken);
    assert.equal(filtered.status, 200);
    const body = await filtered.json();
    assert.equal(body.total, 1);
    assert.equal(body.items[0].action, action);
    assert.equal(body.items[0].importance, "important");
    const serialized = JSON.stringify(body);
    assert.equal(serialized.includes("old-private-value"), false);
    assert.equal(serialized.includes("new-private-value"), false);
    assert.equal(serialized.includes("never-return-this"), false);
    assert.equal(serialized.includes("[REDACTED]"), true);

    const deskDate = (await pool.query("SELECT to_char(now() AT TIME ZONE 'America/New_York', 'YYYY-MM-DD') AS value")).rows[0].value;
    const searched = await callApi(`/audit-history?q=${entityId}&dateFrom=${deskDate}&dateTo=${deskDate}&page=1`, adminToken);
    assert.equal(searched.status, 200);
    const searchedBody = await searched.json();
    assert.equal(searchedBody.items.some((item) => item.eventKind === "change"), true);
    assert.equal(searchedBody.items.some((item) => item.eventKind === "access" && item.importance === "important"), true);
    assert.equal((await callApi(`/audit-history?dateFrom=${deskDate}&dateTo=2020-01-01`, adminToken)).status, 400);
    assert.equal((await callApi("/audit-history?dateFrom=2026-02-30", adminToken)).status, 400);
    console.log("Audit history authorization, search, filters, unified access records, and redaction checks passed.");
  } finally {
    if (ids.access) await pool.query("DELETE FROM sensitive_access_events WHERE id = $1", [ids.access]);
    if (ids.audit) await pool.query("DELETE FROM audit_events WHERE id = $1", [ids.audit]);
    for (const userId of [ids.administrator, ids.agent].filter(Boolean)) {
      await pool.query("DELETE FROM sensitive_access_events WHERE actor_user_id = $1", [userId]);
      await pool.query("DELETE FROM audit_events WHERE actor_user_id = $1 OR (entity_type = 'user' AND entity_id = $2)", [userId, String(userId)]);
      await pool.query("DELETE FROM users WHERE id = $1", [userId]);
    }
    await pool.end();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
