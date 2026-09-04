require("dotenv").config();

const assert = require("node:assert/strict");
const { Pool } = require("pg");
const { BookingFeesService } = require("../dist/modules/booking-fees/booking-fees.service");
const { MessageTemplatesService } = require("../dist/modules/message-templates/message-templates.service");
const { OnboardingService } = require("../dist/modules/clients/onboarding.service");
const { EntityRecordsService } = require("../dist/modules/entity-records/entity-records.service");

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  let clientId; let requestId; let conversationId; const travellerIds = []; let documentId; let noteId;
  try {
    const actorId = (await pool.query("SELECT id FROM users ORDER BY id LIMIT 1")).rows[0]?.id;
    const accountId = (await pool.query("SELECT id FROM whatsapp_connections WHERE is_primary = true")).rows[0]?.id;
    const feeGroup = (await pool.query("SELECT * FROM booking_fee_groups WHERE active = true AND calculation_basis = 'per_passenger' ORDER BY id LIMIT 1")).rows[0];
    const catalogues = (await pool.query(`SELECT
      (SELECT id FROM request_types WHERE active ORDER BY position LIMIT 1) request_type_id,
      (SELECT id FROM request_statuses WHERE active ORDER BY position LIMIT 1) request_status_id,
      (SELECT id FROM urgency_levels WHERE active ORDER BY position LIMIT 1) urgency_level_id`)).rows[0];
    if (!actorId || !accountId || !feeGroup || !catalogues.request_type_id) throw new Error("Test requires a user, Primary WhatsApp account, active per-passenger fee group, and request catalogues");
    clientId = (await pool.query(
      `INSERT INTO clients (name, client_type, phone_number, booking_fee_group_id) VALUES ($1,'household',$2,$3) RETURNING id`,
      [`Phase 1 Records Test ${stamp}`, `+1556${stamp.slice(-7)}`, feeGroup.id])).rows[0].id;
    for (const [name, dob] of [["Adult Test", "1980-01-01"], ["Child Test", "2015-01-01"], ["Infant Test", "2025-01-01"]]) {
      const travellerId = (await pool.query("INSERT INTO travellers (name,dob) VALUES ($1,$2) RETURNING id", [name, dob])).rows[0].id;
      travellerIds.push(travellerId);
      await pool.query("INSERT INTO traveller_accounts (client_id,traveller_id,relationship) VALUES ($1,$2,'child')", [clientId, travellerId]);
    }
    requestId = (await pool.query(
      `INSERT INTO travel_requests (client_id,trip_summary,created_by,request_type_id,request_status_id,urgency_level_id)
       VALUES ($1,'Fee test',$2,$3,$4,$5) RETURNING id`,
      [clientId, actorId, catalogues.request_type_id, catalogues.request_status_id, catalogues.urgency_level_id])).rows[0].id;
    conversationId = (await pool.query("INSERT INTO conversations (whatsapp_connection_id,whatsapp_jid,phone_number,client_id) VALUES ($1,$2,$3,$4) RETURNING id", [accountId, `phase1-${stamp}@g.us`, `1556${stamp.slice(-7)}`, clientId])).rows[0].id;
    await pool.query(
      `INSERT INTO whatsapp_groups (whatsapp_connection_id,client_id,travel_request_id,conversation_id,whatsapp_group_jid,name,status,created_by)
       VALUES ($1,$2,$3,$4,$5,$6,'active',$7)`, [accountId, clientId, requestId, conversationId, `phase1-${stamp}@g.us`, `Phase 1 ${stamp}`, actorId]);

    const fees = new BookingFeesService(pool);
    const quote = await fees.saveRequestFee(requestId, [
      { travellerId: travellerIds[0], category: "adult" },
      { travellerId: travellerIds[1], category: "child" },
      { travellerId: travellerIds[2], category: "infant" },
    ], actorId);
    const expectedUnits = Number(feeGroup.charge_adults) + Number(feeGroup.charge_children) + Number(feeGroup.charge_infants);
    assert.equal(quote.chargedUnits, expectedUnits);
    assert.equal(quote.totalAmount, (Number(feeGroup.amount) * expectedUnits).toFixed(2));
    assert.equal(quote.passengers.length, 3);

    const templates = new MessageTemplatesService(pool, new OnboardingService(pool));
    const bookingTemplateId = (await pool.query("SELECT id FROM message_templates WHERE code='booking_fee_en'")).rows[0].id;
    const rendered = await templates.render(bookingTemplateId, conversationId);
    assert.equal(rendered.missingVariables.length, 0);
    assert.ok(rendered.renderedText.includes(quote.totalAmount) && rendered.renderedText.includes(quote.currency));
    assert.ok(!rendered.renderedText.includes("{{"));

    const records = new EntityRecordsService(pool);
    const savedNote = await records.addNote(clientId, requestId, "Confirmed test note", actorId);
    noteId = savedNote.id;
    assert.equal((await records.listNotes(clientId, requestId))[0].id, savedNote.id);
    const png = Buffer.from([137,80,78,71,13,10,26,10,0,0,0,0]);
    const savedDocument = await records.addDocument(clientId, requestId,
      { originalname: "test.png", mimetype: "image/png", buffer: png, size: png.length }, "Test document", actorId);
    documentId = savedDocument.id;
    const downloaded = await records.downloadDocument(Number(savedDocument.id), actorId);
    assert.deepEqual(downloaded.content, png);
    const activity = await records.activity(clientId, requestId);
    assert.ok(activity.some((item) => item.type === "note") && activity.some((item) => item.type === "document"));
    console.log("Per-passenger fees, contextual templates, notes, documents, downloads, and unified history checks passed");
  } finally {
    if (documentId) await pool.query("DELETE FROM sensitive_access_events WHERE resource_type='entity_document' AND resource_id=$1", [String(documentId)]);
    if (conversationId) await pool.query("DELETE FROM whatsapp_groups WHERE conversation_id=$1", [conversationId]);
    if (conversationId) await pool.query("DELETE FROM conversations WHERE id=$1", [conversationId]);
    if (requestId) await pool.query("DELETE FROM travel_requests WHERE id=$1", [requestId]);
    if (travellerIds.length) await pool.query("DELETE FROM travellers WHERE id = ANY($1::int[])", [travellerIds]);
    if (clientId) await pool.query("DELETE FROM clients WHERE id=$1", [clientId]);
    if (requestId) await pool.query("DELETE FROM audit_events WHERE entity_type='travel_request' AND entity_id=$1", [String(requestId)]);
    if (noteId) await pool.query("DELETE FROM audit_events WHERE entity_type='entity_note' AND entity_id=$1", [String(noteId)]);
    if (documentId) await pool.query("DELETE FROM audit_events WHERE entity_type='entity_document' AND entity_id=$1", [String(documentId)]);
    await pool.end();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
