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

/**
 * Proves the fourth role, live workload authorization, non-blocking exception
 * recording, immutable review result and audit trail, then removes its fixtures.
 */
async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const stamp = Date.now();
  const ids = { supervisor: null, agent: null, request: null, client: null, review: null };
  try {
    const administrator = await pool.query("SELECT id FROM users WHERE active = true ORDER BY id LIMIT 1");
    const administratorId = administrator.rows[0]?.id;
    assert.ok(administratorId, "A local user seed is required");
    const users = new UsersService(pool);
    const profile = { active: true, availabilityStatus: "available", capacityLimit: 10, highPriorityCapacityLimit: 12,
      timezone: "America/New_York", workdays: [1, 2, 3, 4, 5], workdayStart: "08:00", workdayEnd: "18:00", eligibleRequestTypeIds: [] };
    const supervisorEmail = `supervisor-test-${stamp}@example.test`;
    const agentEmail = `supervisor-agent-${stamp}@example.test`;
    const password = `Supervisor-${stamp}!`;
    const supervisor = await users.create({ name: "Supervisor Test", email: supervisorEmail, phoneNumber: `+1556${String(stamp).slice(-7)}`,
      password, roles: ["supervisor_manager"], permissions: backendPermissionsForRoles(["supervisor_manager"]), ...profile }, administratorId);
    ids.supervisor = supervisor.id;
    const agent = await users.create({ name: "Supervisor Agent Test", email: agentEmail, phoneNumber: `+1557${String(stamp).slice(-7)}`,
      password, roles: ["travel_agent"], permissions: backendPermissionsForRoles(["travel_agent"]), ...profile }, administratorId);
    ids.agent = agent.id;
    assert.equal(supervisor.permissions.includes("workloads.manage"), true);
    assert.equal(supervisor.permissions.includes("exceptions.approve"), true);
    assert.equal(supervisor.permissions.includes("ticketing.issue"), false);

    const fixture = await pool.query(
      `WITH catalogues AS (
         SELECT (SELECT id FROM request_types WHERE active = true ORDER BY id LIMIT 1) request_type_id,
                (SELECT id FROM request_statuses WHERE code NOT IN ('completed','cancelled') ORDER BY id LIMIT 1) request_status_id,
                (SELECT id FROM urgency_levels WHERE active = true ORDER BY id LIMIT 1) urgency_level_id
       ), new_client AS (
         INSERT INTO clients (name, client_type, phone_number, booking_fee_group_id)
         VALUES ($1, 'individual', $2, (SELECT id FROM booking_fee_groups ORDER BY id LIMIT 1)) RETURNING id
       )
       INSERT INTO travel_requests
         (client_id, trip_summary, status, created_by, request_type_id, request_status_id,
          urgency_level_id, assigned_user_id, assigned_at, assigned_by_user_id, assignment_status)
       SELECT new_client.id, 'Supervisor test request', 'new', $3, request_type_id, request_status_id,
              urgency_level_id, $4, now(), $3, 'assigned'
       FROM new_client, catalogues RETURNING id, client_id`,
      [`Supervisor Test ${stamp}`, `+1558${String(stamp).slice(-7)}`, administratorId, agent.id],
    );
    ids.request = fixture.rows[0].id;
    ids.client = fixture.rows[0].client_id;

    const supervisorToken = await login(supervisorEmail, password);
    const agentToken = await login(agentEmail, password);
    assert.equal((await callApi("/supervisor/workload?showAll=true", supervisorToken)).status, 200);
    assert.equal((await callApi("/supervisor/workload", agentToken)).status, 403);

    const recorded = await callApi("/supervisor/reviews", agentToken, {
      method: "POST",
      body: JSON.stringify({ requestId: ids.request, type: "markup_change", summary: "Completed markup change",
        overriddenRule: "Standard markup", reason: "Matched documented client agreement", valueAmount: "125.00", currency: "USD" }),
    });
    assert.equal(recorded.status, 201);
    const review = await recorded.json();
    ids.review = review.id;
    assert.equal(review.status, "unreviewed");

    const completed = await callApi(`/supervisor/reviews/${review.id}`, supervisorToken, {
      method: "PATCH", body: JSON.stringify({ outcome: "approved", comment: "Reviewed against the client agreement." }),
    });
    assert.equal(completed.status, 200);
    assert.equal((await completed.json()).outcome, "approved");
    assert.equal((await callApi(`/supervisor/reviews/${review.id}`, supervisorToken, {
      method: "PATCH", body: JSON.stringify({ outcome: "noted", comment: "Attempted rewrite." }),
    })).status, 409);
    const history = await pool.query("SELECT COUNT(*)::int AS count FROM supervisor_review_events WHERE review_item_id = $1", [review.id]);
    assert.equal(history.rows[0].count, 1);
    console.log("Supervisor role, workload, retrospective review, immutable decision, and audit checks passed.");
  } finally {
    if (ids.review) await pool.query("DELETE FROM supervisor_review_items WHERE id = $1", [ids.review]);
    if (ids.request) await pool.query("DELETE FROM travel_requests WHERE id = $1", [ids.request]);
    if (ids.client) await pool.query("DELETE FROM clients WHERE id = $1", [ids.client]);
    for (const userId of [ids.supervisor, ids.agent].filter(Boolean)) {
      await pool.query("DELETE FROM audit_events WHERE actor_user_id = $1 OR (entity_type = 'user' AND entity_id = $2)", [userId, String(userId)]);
      await pool.query("DELETE FROM users WHERE id = $1", [userId]);
    }
    await pool.end();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
