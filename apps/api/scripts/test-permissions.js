const assert = require("node:assert/strict");
const { Pool } = require("pg");
const path = require("node:path");
const dotenv = require("dotenv");
const { UsersService } = require("../dist/modules/users/users.service");
const { backendPermissionsForRoles } = require("../dist/modules/auth/permissions");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

/**
 * Calls the local API with the supplied bearer token and returns the response
 * so this test can prove authorization behavior at the HTTP boundary.
 */
async function callApi(pathname, token, init = {}) {
  return fetch(`http://127.0.0.1:3001${pathname}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init.headers ?? {}) },
  });
}

/**
 * Creates one disposable employee, verifies a database revocation and grant
 * take effect without a new JWT, and removes only that test account afterward.
 */
async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const stamp = Date.now();
  const email = `permission-test-${stamp}@example.test`;
  const password = `Permission-${stamp}!`;
  let userId;
  const requestIds = [];
  const travellerIds = [];
  try {
    const actor = await pool.query("SELECT id FROM users WHERE active = true ORDER BY id LIMIT 1");
    assert.ok(actor.rows[0]?.id, "A local administrator seed is required");
    const service = new UsersService(pool);
    const rolePermissions = backendPermissionsForRoles(["travel_agent"]);
    for (const permission of ["clients.create", "travellers.create", "travellers.link", "onboarding.read", "onboarding.manage"]) {
      assert.equal(rolePermissions.includes(permission), true, `Travel Agent default is missing ${permission}`);
    }
    const created = await service.create({
      name: "Permission Test", email, phoneNumber: `+1555${String(stamp).slice(-7)}`, password,
      roles: ["travel_agent"], permissions: rolePermissions.filter((item) => item !== "clients.read"),
      active: true, availabilityStatus: "available", capacityLimit: 10, highPriorityCapacityLimit: 12,
      timezone: "America/New_York", workdays: [1, 2, 3, 4, 5], workdayStart: "08:00", workdayEnd: "18:00",
      eligibleRequestTypeIds: [],
    }, actor.rows[0].id);
    userId = created.id;
    assert.equal(created.permissions.includes("clients.read"), false);

    const login = await fetch("http://127.0.0.1:3001/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    assert.equal(login.status, 201);
    const { token, user } = await login.json();
    assert.equal(user.permissions.includes("clients.read"), false);
    assert.equal((await callApi("/clients", token)).status, 403);
    assert.equal((await callApi("/requests", token)).status, 200);

    const clientFixture = await pool.query("SELECT id FROM clients ORDER BY id LIMIT 1");
    assert.ok(clientFixture.rows[0]?.id, "Permission test requires one client");
    await pool.query(
      `INSERT INTO user_permission_overrides (user_id, permission_code, granted, changed_by)
       VALUES ($1, 'travellers.link', false, $2)
       ON CONFLICT (user_id, permission_code) DO UPDATE SET granted = false, changed_by = EXCLUDED.changed_by`,
      [userId, actor.rows[0].id],
    );
    const travellerInput = {
      name: "Permission Link Test", dob: "1990-01-01", passportStatus: "missing",
      links: [{ clientId: clientFixture.rows[0].id, relationship: "self" }],
    };
    assert.equal((await callApi("/travellers", token, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(travellerInput),
    })).status, 403, "travellers.create must not imply travellers.link");
    const unlinkedTraveller = await callApi("/travellers", token, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...travellerInput, links: [] }),
    });
    assert.equal(unlinkedTraveller.status, 201, "travellers.create still permits an unlinked traveller");
    travellerIds.push((await unlinkedTraveller.json()).id);

    const fixtures = await pool.query(
      `WITH fixture AS (
         SELECT c.id AS client_id,
                (SELECT id FROM request_types WHERE active = true ORDER BY id LIMIT 1) AS request_type_id,
                (SELECT id FROM request_statuses WHERE active = true ORDER BY id LIMIT 1) AS request_status_id,
                (SELECT id FROM urgency_levels WHERE active = true ORDER BY id LIMIT 1) AS urgency_level_id
         FROM clients c ORDER BY c.id LIMIT 1
       )
       INSERT INTO travel_requests
         (client_id, trip_summary, status, created_by, request_type_id, request_status_id,
          urgency_level_id, assigned_user_id, assigned_at, assigned_by_user_id, assignment_status)
       SELECT client_id, summary, 'new', $1, request_type_id, request_status_id,
              urgency_level_id, owner_id, now(), $1, 'assigned'
       FROM fixture
       CROSS JOIN (VALUES ('Permission test own request', $2::int), ('Permission test other request', $1::int)) AS items(summary, owner_id)
       RETURNING id, assigned_user_id`,
      [actor.rows[0].id, userId],
    );
    assert.equal(fixtures.rowCount, 2, "Permission test requires one client and active request catalogues");
    requestIds.push(...fixtures.rows.map((row) => row.id));
    const ownRequest = fixtures.rows.find((row) => row.assigned_user_id === userId);
    const otherRequest = fixtures.rows.find((row) => row.assigned_user_id !== userId);
    const details = {
      passengerCount: 1, origin: "JFK", destination: "TLV", departureDateText: null,
      returnDateText: null, cabinClass: "Economy", flexibility: null, specialRequests: null,
    };
    assert.equal((await callApi(`/requests/${ownRequest.id}/details`, token, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(details),
    })).status, 200);
    assert.equal((await callApi(`/requests/${otherRequest.id}/details`, token, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(details),
    })).status, 403);
    assert.equal((await callApi(`/requests/${ownRequest.id}/records/notes`, token)).status, 200);
    assert.equal((await callApi(`/requests/${otherRequest.id}/records/notes`, token)).status, 403);
    assert.equal((await callApi(`/booking-fees/requests/${otherRequest.id}`, token, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passengers: [{ travellerId: 1, category: "adult" }] }),
    })).status, 403);

    const updated = await service.update(userId, {
      name: created.name, email: created.email, phoneNumber: created.phoneNumber,
      roles: ["travel_agent"], permissions: [...created.permissions, "clients.read"],
      active: true, availabilityStatus: created.availabilityStatus, capacityLimit: created.capacityLimit,
      highPriorityCapacityLimit: created.highPriorityCapacityLimit, timezone: created.timezone,
      workdays: created.workdays, workdayStart: created.workdayStart, workdayEnd: created.workdayEnd,
      eligibleRequestTypeIds: created.eligibleRequestTypeIds,
    }, actor.rows[0].id);
    assert.equal(updated.permissions.includes("clients.read"), true);
    assert.equal((await callApi("/clients", token)).status, 200);

    await assert.rejects(
      service.update(userId, {
        name: updated.name, email: updated.email, phoneNumber: updated.phoneNumber,
        roles: ["travel_agent"], permissions: [...updated.permissions, "ticketing.issue"],
        active: true, availabilityStatus: updated.availabilityStatus, capacityLimit: updated.capacityLimit,
        highPriorityCapacityLimit: updated.highPriorityCapacityLimit, timezone: updated.timezone,
        workdays: updated.workdays, workdayStart: updated.workdayStart, workdayEnd: updated.workdayEnd,
        eligibleRequestTypeIds: updated.eligibleRequestTypeIds,
      }, actor.rows[0].id),
      /not implemented yet/,
    );

    await pool.query(
      `INSERT INTO user_permission_overrides (user_id, permission_code, granted, changed_by)
       VALUES ($1, 'ticketing.issue', true, $1)`,
      [userId],
    );
    const me = await callApi("/auth/me", token);
    assert.equal(me.status, 200);
    assert.equal((await me.json()).permissions.includes("ticketing.issue"), false);
    console.log("Permission API integration checks passed.");
  } finally {
    if (requestIds.length) await pool.query("DELETE FROM travel_requests WHERE id = ANY($1::int[])", [requestIds]);
    if (travellerIds.length) await pool.query("DELETE FROM travellers WHERE id = ANY($1::int[])", [travellerIds]);
    if (userId) {
      await pool.query("DELETE FROM sensitive_access_events WHERE actor_user_id = $1", [userId]);
      await pool.query("DELETE FROM audit_events WHERE actor_user_id = $1", [userId]);
      await pool.query("DELETE FROM users WHERE id = $1", [userId]);
    }
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
