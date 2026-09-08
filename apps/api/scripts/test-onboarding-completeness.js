require("dotenv").config();

const assert = require("node:assert/strict");
const { Pool } = require("pg");
const { OnboardingService } = require("../dist/modules/clients/onboarding.service");
const { ClientsService } = require("../dist/modules/clients/clients.service");

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = await pool.connect();

  try {
    await db.query("BEGIN");
    const actorId = (await db.query("SELECT id FROM users ORDER BY id LIMIT 1")).rows[0]?.id;
    const feeGroupId = (await db.query("SELECT id FROM booking_fee_groups WHERE active = true ORDER BY id LIMIT 1")).rows[0]?.id;
    if (!actorId || !feeGroupId) throw new Error("Onboarding test requires one user and one active fee group");

    const service = new OnboardingService(db);
    const clientId = (await db.query(
      `INSERT INTO clients (name, client_type, phone_number, booking_fee_group_id, stage)
       VALUES ($1, 'individual', $2, $3, 'new_inquiry') RETURNING id`,
      [`Onboarding Test ${Date.now()}`, `+1555${String(Date.now()).slice(-7)}`, feeGroupId],
    )).rows[0].id;

    await service.recordInitialStage(db, clientId, "new_inquiry", actorId);
    await db.query(
      "UPDATE onboarding_stages SET generates_task = true, expected_duration_minutes = 30 WHERE code = 'welcome_sent'",
    );
    await service.applyStageTransition(db, clientId, "new_inquiry", "welcome_sent", null, actorId);
    await db.query("UPDATE clients SET stage = 'welcome_sent' WHERE id = $1", [clientId]);

    let clientStatus = await service.getClientStatus(clientId, db);
    assert.equal(clientStatus.tasks.filter((task) => task.status === "open").length, 1, "milestone transition should create a task");
    clientStatus = await service.completeTask(clientId, clientStatus.tasks[0].id, actorId);
    assert.equal(clientStatus.tasks[0].status, "completed", "milestone task should be completable");
    assert.equal(clientStatus.canComplete, false, "client without a traveller must be incomplete");

    async function expectBothStagesBlocked(reason) {
      const before = (await db.query("SELECT count(*)::int AS count FROM client_onboarding_transitions WHERE client_id = $1", [clientId])).rows[0].count;
      for (const [from, to] of [["information_received", "review_complete"], ["review_complete", "fully_onboarded"]]) {
        await assert.rejects(() => service.applyStageTransition(db, clientId, from, to, null, actorId),
          (error) => error.getStatus?.() === 400 && reason.test(error.message), `${to} must reject incomplete information`);
      }
      const after = (await db.query("SELECT count(*)::int AS count FROM client_onboarding_transitions WHERE client_id = $1", [clientId])).rows[0].count;
      assert.equal(after, before, "rejected transitions must not add stage history");
    }
    await expectBothStagesBlocked(/Add at least one traveller/);

    const travellerId = (await db.query(
      `INSERT INTO travellers (name, dob, passport_status) VALUES ('Test Traveller', '1990-01-02', 'missing') RETURNING id`,
    )).rows[0].id;
    await db.query(
      "INSERT INTO traveller_accounts (client_id, traveller_id, relationship) VALUES ($1, $2, 'self')",
      [clientId, travellerId],
    );

    clientStatus = await service.getClientStatus(clientId, db);
    const legalNames = clientStatus.checklist.find((item) => item.fieldKey === "legal_names");
    const dob = clientStatus.checklist.find((item) => item.fieldKey === "date_of_birth");
    assert.ok(legalNames?.present && !legalNames.reviewed, "legal name should be present but require review");
    assert.ok(dob?.present && !dob.reviewed, "date of birth should be present but require review");
    await expectBothStagesBlocked(/needs review/);

    await db.query("UPDATE travellers SET dob = NULL WHERE id = $1", [travellerId]);
    await expectBothStagesBlocked(/Date of birth is missing/);
    await db.query("UPDATE travellers SET dob = '1990-01-02' WHERE id = $1", [travellerId]);

    await service.reviewClientField(clientId, legalNames.requirementFieldId, "traveller", travellerId, actorId);
    await expectBothStagesBlocked(/Date of birth needs review/);
    clientStatus = await service.reviewClientField(clientId, dob.requirementFieldId, "traveller", travellerId, actorId);
    assert.equal(clientStatus.canComplete, true, "reviewing all required traveller data should clear the gate");

    await db.query("UPDATE clients SET stage = 'information_received' WHERE id = $1", [clientId]);
    await service.applyStageTransition(db, clientId, "information_received", "review_complete", null, actorId);
    await db.query("UPDATE clients SET stage = 'review_complete' WHERE id = $1", [clientId]);
    await service.applyStageTransition(db, clientId, "review_complete", "fully_onboarded", null, actorId);

    await db.query("UPDATE travellers SET dob = '1991-02-03' WHERE id = $1", [travellerId]);
    clientStatus = await service.getClientStatus(clientId, db);
    assert.equal(clientStatus.canComplete, false, "editing a reviewed value must invalidate the old review");
    assert.ok(clientStatus.missingItems.some((item) => item.includes("Date of birth") && item.includes("needs review")));
    await expectBothStagesBlocked(/Date of birth needs review/);
    await service.reviewClientField(clientId, dob.requirementFieldId, "traveller", travellerId, actorId);

    // Newly linked family members must also pass the checklist.
    const childId = (await db.query("INSERT INTO travellers (name, dob) VALUES ('Unreviewed Child', '2020-01-02') RETURNING id")).rows[0].id;
    await db.query("INSERT INTO traveller_accounts (client_id, traveller_id, relationship) VALUES ($1, $2, 'child')", [clientId, childId]);
    await expectBothStagesBlocked(/Unreviewed Child/);
    for (const item of (await service.getClientStatus(clientId, db)).checklist.filter((item) => item.entityId === childId && item.requiresReview)) {
      await service.reviewClientField(clientId, item.requirementFieldId, "traveller", childId, actorId);
    }

    // Passport is optional unless the administrator configures it as required.
    // This rule and all test changes exist only inside the rolled-back transaction.
    const passportRuleId = (await db.query(`INSERT INTO required_information_fields
      (entity_type, field_key, label, required, requires_review, position)
      VALUES ('traveller', 'passport_number', 'Passport number', true, true, 25)
      ON CONFLICT (entity_type, field_key) DO UPDATE SET required=true, requires_review=true, active=true
      RETURNING id`)).rows[0].id;
    await expectBothStagesBlocked(/Passport number is missing/);
    for (const id of [travellerId, childId]) {
      await db.query("UPDATE travellers SET passport_number = $2 WHERE id = $1", [id, `TEST-${id}`]);
      await service.reviewClientField(clientId, passportRuleId, "traveller", id, actorId);
    }

    // Validate actual client updates atomically, including a field edited in the
    // same submission as the stage change. Map inner transactions to savepoints.
    const adapter = { query: (...args) => db.query(...args), connect: async () => ({
      release() {}, query: (sql, args) => db.query(sql === "BEGIN" ? "SAVEPOINT client_update"
        : sql === "COMMIT" ? "RELEASE SAVEPOINT client_update"
        : sql === "ROLLBACK" ? "ROLLBACK TO SAVEPOINT client_update" : sql, args),
    }) };
    const clients = new ClientsService(adapter, service);
    const clientRuleId = (await db.query(`INSERT INTO required_information_fields
      (entity_type, field_key, label, required, requires_review, position)
      VALUES ('client', 'name', 'Client name', true, true, 5)
      ON CONFLICT (entity_type, field_key) DO UPDATE SET required=true, requires_review=true, active=true
      RETURNING id`)).rows[0].id;
    await expectBothStagesBlocked(/Client name needs review/);
    await service.reviewClientField(clientId, clientRuleId, "client", clientId, actorId);
    await db.query("UPDATE clients SET stage = 'information_received' WHERE id = $1", [clientId]);
    const original = (await db.query("SELECT name, phone_number FROM clients WHERE id = $1", [clientId])).rows[0];
    const input = { name: original.name, phoneNumber: original.phone_number, clientType: "individual",
      bookingFeeGroupId: feeGroupId, preferredRepId: null, secondaryRepId: null, stage: "review_complete" };
    await assert.rejects(() => clients.update(clientId, { ...input, name: "Changed during review" }, actorId), /Client name needs review/);
    assert.deepEqual((await db.query("SELECT name, stage FROM clients WHERE id = $1", [clientId])).rows[0],
      {name: original.name, stage: "information_received"}, "failed transition must roll back the entire profile edit");
    assert.equal((await clients.update(clientId, input, actorId)).stage, "review_complete");
    await db.query("UPDATE travellers SET dob = NULL WHERE id = $1", [childId]);
    await assert.rejects(() => clients.update(clientId, { ...input, stage: "fully_onboarded" }, actorId), /Date of birth is missing/);
    assert.equal((await db.query("SELECT stage FROM clients WHERE id=$1", [clientId])).rows[0].stage, "review_complete");
    await db.query("UPDATE travellers SET dob = '2020-01-02' WHERE id=$1", [childId]);
    assert.equal((await clients.update(clientId, { ...input, stage: "fully_onboarded" }, actorId)).stage, "fully_onboarded");

    const catalogues = await db.query(
      `SELECT
         (SELECT id FROM request_types WHERE active = true ORDER BY position, id LIMIT 1) AS request_type_id,
         (SELECT id FROM request_statuses WHERE active = true ORDER BY position, id LIMIT 1) AS request_status_id,
         (SELECT id FROM urgency_levels WHERE active = true ORDER BY position, id LIMIT 1) AS urgency_level_id`,
    );
    const ids = catalogues.rows[0];
    const requestId = (await db.query(
      `INSERT INTO travel_requests
         (client_id, trip_summary, created_by, request_type_id, request_status_id, urgency_level_id)
       VALUES ($1, 'Test route', $2, $3, $4, $5) RETURNING id`,
      [clientId, actorId, ids.request_type_id, ids.request_status_id, ids.urgency_level_id],
    )).rows[0].id;

    let requestStatus = await service.getRequestStatus(requestId, db);
    assert.equal(requestStatus.complete, false, "request without airports and travel dates must be incomplete");
    await db.query(
      `UPDATE travel_requests SET origin = 'JFK', destination = 'TLV', departure_date_text = '20 Sep' WHERE id = $1`,
      [requestId],
    );
    requestStatus = await service.getRequestStatus(requestId, db);
    for (const item of requestStatus.checklist.filter((entry) => entry.required)) {
      requestStatus = await service.reviewRequestField(requestId, item.requirementFieldId, actorId);
    }
    assert.equal(requestStatus.complete, true, "completed and reviewed required request data should pass");

    console.log("Both onboarding gates, missing/unreviewed/changed fields, linked travellers, configurable passport requirements, atomic profile updates, tasks and request-information checks passed");
  } finally {
    await db.query("ROLLBACK");
    db.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
