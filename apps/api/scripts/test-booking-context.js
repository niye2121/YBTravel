require("dotenv").config();

const assert = require("node:assert/strict");
const { Pool } = require("pg");
const {
  decideBookingResolution,
  resolveClosestFutureDate,
} = require("../dist/modules/messaging/booking-context");
const { DraftIntakesService } = require("../dist/modules/messaging/draft-intakes.service");

/**
 * Proves the deterministic year inference and confidence gates without using
 * an AI provider or database, making the critical edge cases fast to rerun.
 */
function testPureBookingRules() {
  const late2026 = new Date("2026-12-20T12:00:00Z");
  assert.deepEqual(resolveClosestFutureDate("January", late2026), {
    displayText: "January 2027",
    isoDate: "2027-01-01",
    precision: "month",
    inferenceNote: 'Interpreted "January" as January 2027, the closest logical future date.',
  });
  assert.equal(resolveClosestFutureDate("15 January", late2026).isoDate, "2027-01-15");
  assert.equal(resolveClosestFutureDate("January 2026", late2026).isoDate, "2026-01-01");
  assert.equal(resolveClosestFutureDate("next January", new Date("2026-01-10T12:00:00Z")).isoDate, "2027-01-01");
  assert.equal(resolveClosestFutureDate("31 February", late2026).isoDate, null);

  assert.equal(decideBookingResolution({
    intent: "existing_booking",
    matchedTravelRequestId: 10,
    confidence: 90,
    reason: "The destination and date match.",
  }, [10, 11]).resolution, "matched");
  assert.equal(decideBookingResolution({
    intent: "existing_booking",
    matchedTravelRequestId: 10,
    confidence: 70,
    reason: "The date may match.",
  }, [10]).resolution, "ambiguous");
  assert.equal(decideBookingResolution({
    intent: "new_booking",
    matchedTravelRequestId: null,
    confidence: 92,
    reason: "The client introduced another destination.",
  }, [10]).resolution, "new_booking");
  assert.equal(decideBookingResolution({
    intent: "unclear",
    matchedTravelRequestId: null,
    confidence: 40,
    reason: "Two bookings remain plausible.",
  }, [10, 11]).resolution, "ambiguous");
}

/**
 * Inserts one compact request fixture with the exact lifecycle and date state
 * needed by the booking-context integration scenarios.
 */
async function insertRequest(pool, fixture) {
  const result = await pool.query(
    `INSERT INTO travel_requests
       (client_id, trip_summary, created_by, request_type_id, request_status_id,
        urgency_level_id, origin, destination, departure_date_text,
        resolved_departure_date, departure_date_precision)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
    [fixture.clientId, fixture.summary, fixture.actorId, fixture.typeId,
     fixture.statusId, fixture.urgencyId, fixture.origin, fixture.destination,
     fixture.departureText, fixture.resolvedDepartureDate, fixture.precision],
  );
  return result.rows[0].id;
}

/**
 * Builds real client, conversation, and request rows to prove that completed
 * travel disappears and that a reviewed answer updates only the selected open
 * booking. Every fixture is removed even when an assertion fails.
 */
async function testDatabaseBookingFlow() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const requestIds = [];
  let clientId;
  let conversationId;
  let messageId;
  let draftId;
  let followUpDraftId;
  let shortAnswerDraftId;
  try {
    const setup = (await pool.query(`SELECT
      (SELECT id FROM users ORDER BY id LIMIT 1) AS actor_id,
      (SELECT id FROM whatsapp_connections ORDER BY is_primary DESC, id LIMIT 1) AS account_id,
      (SELECT id FROM booking_fee_groups WHERE active ORDER BY id LIMIT 1) AS fee_group_id,
      (SELECT id FROM request_types WHERE code = 'new_flight_booking') AS type_id,
      (SELECT id FROM request_statuses WHERE code = 'new') AS new_status_id,
      (SELECT id FROM request_statuses WHERE code = 'completed') AS completed_status_id,
      (SELECT id FROM urgency_levels WHERE code = 'normal') AS urgency_id`)).rows[0];
    if (!setup.actor_id || !setup.account_id || !setup.fee_group_id) {
      throw new Error("Booking-context test requires migrated workflow catalogues, a user, a WhatsApp account, and an active fee group");
    }

    clientId = (await pool.query(
      `INSERT INTO clients (name, client_type, phone_number, booking_fee_group_id)
       VALUES ($1, 'household', $2, $3) RETURNING id`,
      [`Booking Context Test ${stamp}`, `+1557${stamp.slice(-7)}`, setup.fee_group_id],
    )).rows[0].id;
    conversationId = (await pool.query(
      `INSERT INTO conversations (whatsapp_connection_id, whatsapp_jid, phone_number, client_id)
       VALUES ($1,$2,$3,$4) RETURNING id`,
      [setup.account_id, `booking-context-${stamp}@s.whatsapp.net`, `1557${stamp.slice(-7)}`, clientId],
    )).rows[0].id;

    const futureId = await insertRequest(pool, {
      clientId, actorId: setup.actor_id, typeId: setup.type_id, statusId: setup.new_status_id,
      urgencyId: setup.urgency_id, summary: "Addis Ababa to London in January",
      origin: "Addis Ababa", destination: "London", departureText: "January 2027",
      resolvedDepartureDate: "2027-01-01", precision: "month",
    });
    requestIds.push(futureId);
    requestIds.push(await insertRequest(pool, {
      clientId, actorId: setup.actor_id, typeId: setup.type_id, statusId: setup.new_status_id,
      urgencyId: setup.urgency_id, summary: "Past one-way trip", origin: "London",
      destination: "Paris", departureText: "1 January 2025",
      resolvedDepartureDate: "2025-01-01", precision: "day",
    }));
    requestIds.push(await insertRequest(pool, {
      clientId, actorId: setup.actor_id, typeId: setup.type_id, statusId: setup.completed_status_id,
      urgencyId: setup.urgency_id, summary: "Manually completed trip", origin: "Rome",
      destination: "Athens", departureText: "January 2028",
      resolvedDepartureDate: "2028-01-01", precision: "month",
    }));

    let capturedAiInput;
    let aiCallCount = 0;
    const fakeOpenAi = {
      /** Returns a controlled contextual match while retaining the AI input for assertions. */
      async createTextResponse(input) {
        capturedAiInput = JSON.parse(input.input);
        aiCallCount += 1;
        if (aiCallCount > 1) {
          return {
            responseId: `test-follow-up-${stamp}`,
            text: JSON.stringify({
              isRequest: true,
              requestTypeCode: "new_flight_booking",
              urgencyCode: "normal",
              summary: "Customer supplied exact round-trip dates",
              passengerCount: null,
              origin: null,
              destination: null,
              departureDateText: "January 15, 2027",
              returnDateText: "January 29, 2027",
              missingInformation: [],
              suggestedReply: "Thank you. The dates are noted.",
              confidence: 99,
              bookingIntent: "new_booking",
              matchedTravelRequestId: null,
              bookingMatchConfidence: 99,
              bookingMatchReason: "The AI incorrectly called the follow-up a new booking.",
            }),
          };
        }
        return {
          responseId: `test-${stamp}`,
          text: JSON.stringify({
            isRequest: true,
            requestTypeCode: "new_flight_booking",
            urgencyCode: "normal",
            summary: "Customer confirmed January for London",
            passengerCount: null,
            origin: null,
            destination: "London",
            departureDateText: "January",
            returnDateText: null,
            missingInformation: [],
            suggestedReply: "Thank you. I have noted January for the London booking.",
            confidence: 95,
            bookingIntent: "existing_booking",
            matchedTravelRequestId: futureId,
            bookingMatchConfidence: 95,
            bookingMatchReason: "The preceding question and destination identify this booking.",
          }),
        };
      },
    };
    const requestAccess = {
      /** Allows this test fixture to exercise the update after service-level ownership validation. */
      async assertCanManage() {},
    };
    const gateway = {
      /** Replaces the WebSocket notification because this script has no connected browser. */
      emitDraftIntakeUpdated() {},
    };
    const service = new DraftIntakesService(pool, fakeOpenAi, requestAccess, gateway);
    const openBookings = await service.loadOpenBookings(conversationId);
    assert.deepEqual(openBookings.map((booking) => booking.id), [futureId]);

    await pool.query(
      `INSERT INTO messages (conversation_id, direction, body, sender_jid, delivery_status)
       VALUES ($1, 'outbound', 'Which month works for the London booking?', 'me', 'sent')`,
      [conversationId],
    );
    messageId = (await pool.query(
      `INSERT INTO messages (conversation_id, direction, body, sender_jid, delivery_status)
       VALUES ($1, 'inbound', 'January is fine', 'client', 'received') RETURNING id`,
      [conversationId],
    )).rows[0].id;
    const analyzed = await service.analyzeInboundMessage(messageId, setup.actor_id);
    assert.ok(analyzed);
    draftId = analyzed.id;
    assert.equal(analyzed.bookingResolution, "matched");
    assert.equal(analyzed.matchedTravelRequestId, futureId);
    assert.equal(analyzed.departureDateText, "January 2027");
    assert.equal(capturedAiInput.latestCustomerMessage, "January is fine");
    assert.equal(capturedAiInput.recentConversation.at(-2).body, "Which month works for the London booking?");

    const approved = await service.applyToBooking(draftId, setup.actor_id, ["requests.assign_any"]);
    assert.equal(approved.status, "approved");
    assert.equal(approved.travelRequestId, futureId);
    const updated = (await pool.query(
      "SELECT origin, destination, departure_date_text FROM travel_requests WHERE id = $1",
      [futureId],
    )).rows[0];
    assert.equal(updated.origin, "Addis Ababa");
    assert.equal(updated.destination, "London");
    assert.equal(updated.departure_date_text, "January 2027");

    await pool.query(
      `INSERT INTO messages (conversation_id, direction, body, sender_jid, delivery_status)
       VALUES ($1, 'outbound', 'What exact departure and return dates work for this booking?', 'me', 'sent')`,
      [conversationId],
    );
    const followUpMessageId = (await pool.query(
      `INSERT INTO messages (conversation_id, direction, body, sender_jid, delivery_status)
       VALUES ($1, 'inbound', 'Round trip. Depart January 15, 2027 and return January 29, 2027.', 'client', 'received') RETURNING id`,
      [conversationId],
    )).rows[0].id;
    const followUp = await service.analyzeInboundMessage(followUpMessageId, setup.actor_id);
    assert.ok(followUp);
    followUpDraftId = followUp.id;
    assert.equal(followUp.bookingResolution, "matched");
    assert.equal(followUp.matchedTravelRequestId, futureId);
    assert.equal(followUp.bookingMatchConfidence, 100);
    assert.match(followUp.bookingMatchReason, /follow-up answer for active booking/i);
    assert.equal(capturedAiInput.activeBookingContext.id, futureId);

    await service.applyToBooking(followUpDraftId, setup.actor_id, ["requests.assign_any"]);
    await pool.query(
      `INSERT INTO messages (conversation_id, direction, body, sender_jid, delivery_status)
       VALUES ($1, 'outbound', 'Do you have any airline, baggage, or stopover preferences?', 'me', 'sent')`,
      [conversationId],
    );
    const shortAnswerMessageId = (await pool.query(
      `INSERT INTO messages (conversation_id, direction, body, sender_jid, delivery_status)
       VALUES ($1, 'inbound', 'no', 'client', 'received') RETURNING id`,
      [conversationId],
    )).rows[0].id;
    const shortAnswer = await service.analyzeInboundMessage(shortAnswerMessageId, setup.actor_id);
    assert.ok(shortAnswer);
    shortAnswerDraftId = shortAnswer.id;
    assert.equal(shortAnswer.bookingResolution, "matched");
    assert.equal(shortAnswer.matchedTravelRequestId, futureId);
  } finally {
    if (shortAnswerDraftId) await pool.query("DELETE FROM ai_draft_intakes WHERE id = $1", [shortAnswerDraftId]);
    if (followUpDraftId) await pool.query("DELETE FROM ai_draft_intakes WHERE id = $1", [followUpDraftId]);
    if (draftId) await pool.query("DELETE FROM ai_draft_intakes WHERE id = $1", [draftId]);
    if (conversationId) await pool.query("DELETE FROM messages WHERE conversation_id = $1", [conversationId]);
    if (requestIds.length) {
      await pool.query("DELETE FROM audit_events WHERE entity_type = 'travel_request' AND entity_id = ANY($1::text[])", [requestIds.map(String)]);
      await pool.query("DELETE FROM travel_requests WHERE id = ANY($1::int[])", [requestIds]);
    }
    if (draftId) await pool.query("DELETE FROM audit_events WHERE entity_type = 'ai_draft_intake' AND entity_id = $1", [String(draftId)]);
    if (conversationId) await pool.query("DELETE FROM conversations WHERE id = $1", [conversationId]);
    if (clientId) await pool.query("DELETE FROM clients WHERE id = $1", [clientId]);
    await pool.end();
  }
}

/**
 * Runs fast rules first and then the database lifecycle scenario, producing one
 * clear success line for local and CI verification.
 */
async function main() {
  testPureBookingRules();
  await testDatabaseBookingFlow();
  console.log("Booking date inference, confidence gating, lifecycle closure, and existing-booking application checks passed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
