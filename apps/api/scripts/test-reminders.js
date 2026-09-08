require("dotenv").config();

const assert = require("node:assert/strict");
const { Pool } = require("pg");
const { RemindersService } = require("../dist/modules/reminders/reminders.service");

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const service = new RemindersService(pool);
  const stamp = Date.now();
  let clientId;
  let requestId;
  let reminderIds = [];
  try {
    const staleClientIds = (await pool.query("SELECT id FROM clients WHERE name LIKE 'Reminder Test %'"))
      .rows.map((row) => row.id);
    if (staleClientIds.length) {
      await pool.query(
        `DELETE FROM staff_notifications WHERE reminder_delivery_id IN (
           SELECT delivery.id FROM staff_reminder_deliveries delivery
           JOIN staff_reminders reminder ON reminder.id = delivery.reminder_id
           WHERE reminder.client_id = ANY($1::int[])
         )`,
        [staleClientIds],
      );
      await pool.query(
        `DELETE FROM audit_events WHERE entity_type = 'staff_reminder'
         AND entity_id IN (SELECT id::text FROM staff_reminders WHERE client_id = ANY($1::int[]))`,
        [staleClientIds],
      );
      await pool.query("DELETE FROM onboarding_tasks WHERE client_id = ANY($1::int[])", [staleClientIds]);
      await pool.query("DELETE FROM travel_requests WHERE client_id = ANY($1::int[])", [staleClientIds]);
      await pool.query("DELETE FROM clients WHERE id = ANY($1::int[])", [staleClientIds]);
    }
    const catalogues = (await pool.query(`
      SELECT (SELECT id FROM users WHERE active = true ORDER BY id LIMIT 1) AS actor_id,
             (SELECT id FROM booking_fee_groups WHERE active = true ORDER BY id LIMIT 1) AS fee_group_id,
             (SELECT id FROM request_types WHERE active = true ORDER BY position, id LIMIT 1) AS request_type_id,
             (SELECT id FROM request_statuses WHERE code = 'waiting_for_information') AS request_status_id,
             (SELECT id FROM urgency_levels WHERE active = true ORDER BY position, id LIMIT 1) AS urgency_level_id,
             (SELECT id FROM onboarding_stages WHERE active = true ORDER BY position, id LIMIT 1) AS stage_id
    `)).rows[0];
    for (const [key, value] of Object.entries(catalogues)) assert.ok(value, `Reminder test requires ${key}`);

    clientId = (await pool.query(
      `INSERT INTO clients (name, client_type, phone_number, booking_fee_group_id, preferred_rep_id)
       VALUES ($1, 'individual', $2, $3, $4) RETURNING id`,
      [`Reminder Test ${stamp}`, `+1555${String(stamp).slice(-7)}`, catalogues.fee_group_id, catalogues.actor_id],
    )).rows[0].id;
    requestId = (await pool.query(
      `INSERT INTO travel_requests
         (client_id, trip_summary, status, created_by, request_type_id, request_status_id,
          urgency_level_id, assigned_user_id, assignment_status, response_due_at, service_due_at)
       VALUES ($1, 'JFK to TLV reminder test', 'waiting_for_information', $2, $3, $4, $5, $2,
               'assigned', now() - interval '45 minutes', now() + interval '10 minutes')
       RETURNING id`,
      [clientId, catalogues.actor_id, catalogues.request_type_id, catalogues.request_status_id, catalogues.urgency_level_id],
    )).rows[0].id;
    await pool.query(
      `INSERT INTO onboarding_tasks
         (client_id, stage_id, title, responsible_role, priority, due_at, created_by)
       VALUES ($1, $2, 'Collect passport details', 'travel_agent', 'urgent', now() - interval '5 hours', $3)`,
      [clientId, catalogues.stage_id, catalogues.actor_id],
    );

    const firstRun = await service.runCycle();
    assert.equal(firstRun.synchronized, true);
    const queue = await service.list(catalogues.actor_id, ["notifications.read", "requests.assign_any"], "active", "mine");
    const fixtures = queue.reminders.filter((reminder) => reminder.clientId === clientId);
    reminderIds = fixtures.map((reminder) => Number(reminder.id));
    assert.equal(fixtures.length, 4, "request and onboarding sources should create four reminders");
    assert.equal(fixtures.filter((reminder) => reminder.state === "overdue").length, 2);
    assert.equal(fixtures.filter((reminder) => reminder.state === "due").length, 1);
    assert.equal(fixtures.filter((reminder) => reminder.state === "escalated").length, 1);

    const initialNotifications = (await pool.query(
      `SELECT count(*)::int AS count FROM staff_notifications notification
       JOIN staff_reminder_deliveries delivery ON delivery.id = notification.reminder_delivery_id
       WHERE delivery.reminder_id = ANY($1::bigint[])`,
      [reminderIds],
    )).rows[0].count;
    assert.equal(initialNotifications, 4, "each actionable reminder state should deliver once");
    await service.runCycle();
    const repeatedNotifications = (await pool.query(
      `SELECT count(*)::int AS count FROM staff_notifications notification
       JOIN staff_reminder_deliveries delivery ON delivery.id = notification.reminder_delivery_id
       WHERE delivery.reminder_id = ANY($1::bigint[])`,
      [reminderIds],
    )).rows[0].count;
    assert.equal(repeatedNotifications, initialNotifications, "retry-safe processing must not duplicate notifications");

    const unanswered = fixtures.find((reminder) => reminder.type === "unanswered_inquiry");
    assert.ok(unanswered);
    const acknowledged = await service.acknowledge(Number(unanswered.id), catalogues.actor_id, ["notifications.read"]);
    assert.equal(acknowledged.state, "acknowledged");

    const staleDelivery = (await pool.query(
      `SELECT id FROM staff_reminder_deliveries
       WHERE reminder_id = ANY($1::bigint[]) AND delivery_state = 'delivered'
       ORDER BY id LIMIT 1`,
      [reminderIds.filter((id) => id !== Number(unanswered.id))],
    )).rows[0];
    assert.ok(staleDelivery);
    await pool.query("DELETE FROM staff_notifications WHERE reminder_delivery_id = $1", [staleDelivery.id]);
    await pool.query(
      `UPDATE staff_reminder_deliveries SET delivery_state = 'processing', locked_at = now() - interval '10 minutes'
       WHERE id = $1`,
      [staleDelivery.id],
    );
    await service.runCycle();
    const recovered = (await pool.query(
      "SELECT delivery_state, attempt_count FROM staff_reminder_deliveries WHERE id = $1",
      [staleDelivery.id],
    )).rows[0];
    assert.equal(recovered.delivery_state, "delivered", "a stale lock should be recovered and retried");
    assert.ok(recovered.attempt_count >= 2);

    await pool.query("UPDATE travel_requests SET first_response_at = now() WHERE id = $1", [requestId]);
    await service.runCycle();
    const resolved = await service.list(catalogues.actor_id, ["notifications.read"], "resolved", "mine");
    assert.ok(resolved.reminders.some((reminder) => reminder.id === unanswered.id), "source completion should resolve an active unanswered reminder");
    console.log("Durable reminder synchronization, states, acknowledgement, delivery idempotency, stale-lock recovery, and source resolution passed.");
  } finally {
    if (reminderIds.length) {
      await pool.query("DELETE FROM staff_notifications WHERE reminder_delivery_id IN (SELECT id FROM staff_reminder_deliveries WHERE reminder_id = ANY($1::bigint[]))", [reminderIds]);
      await pool.query("DELETE FROM audit_events WHERE entity_type = 'staff_reminder' AND entity_id = ANY($1::text[])", [reminderIds.map(String)]);
    }
    if (clientId) {
      await pool.query("DELETE FROM onboarding_tasks WHERE client_id = $1", [clientId]);
      await pool.query("DELETE FROM travel_requests WHERE client_id = $1", [clientId]);
      await pool.query("DELETE FROM clients WHERE id = $1", [clientId]);
    }
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
