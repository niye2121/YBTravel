require("dotenv").config();
const assert = require("node:assert/strict");
const { Pool } = require("pg");
const { EntityRecordsService } = require("../dist/modules/entity-records/entity-records.service");

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = await pool.connect();
  await db.query("BEGIN");
  let failAudit = false;
  const adapter = { query: (...args) => db.query(...args), connect: async () => ({ release() {},
    query: (sql, args) => {
      if (failAudit && sql.includes("INSERT INTO audit_events")) throw new Error("Simulated audit failure");
      return db.query(sql === "BEGIN" ? "SAVEPOINT attachment_action" : sql === "COMMIT"
        ? "RELEASE SAVEPOINT attachment_action" : sql === "ROLLBACK" ? "ROLLBACK TO SAVEPOINT attachment_action" : sql, args);
    },
  }) };
  try {
    const actorId = (await db.query("SELECT id FROM users ORDER BY id LIMIT 1")).rows[0].id;
    const otherId = (await db.query("INSERT INTO users(name,email,password_hash,roles) VALUES('Attachment test',$1,'unused',ARRAY['travel_agent']) RETURNING id", [`attachment-${Date.now()}@example.test`])).rows[0].id;
    const feeId = (await db.query("SELECT id FROM booking_fee_groups WHERE active ORDER BY id LIMIT 1")).rows[0].id;
    const clientId = (await db.query("INSERT INTO clients(name,client_type,booking_fee_group_id) VALUES('Attachment test','household',$1) RETURNING id", [feeId])).rows[0].id;
    const requestId = (await db.query(`INSERT INTO travel_requests (client_id,trip_summary,created_by,assigned_user_id,
      request_type_id,request_status_id,urgency_level_id) VALUES($1,'Attachment test',$2,$2,
      (SELECT id FROM request_types WHERE active ORDER BY id LIMIT 1),
      (SELECT id FROM request_statuses WHERE active ORDER BY id LIMIT 1),
      (SELECT id FROM urgency_levels WHERE active ORDER BY id LIMIT 1)) RETURNING id`, [clientId, actorId])).rows[0].id;
    const service = new EntityRecordsService(adapter);
    const bytes = Buffer.from('%PDF-1.4\nAttachment test\n%%EOF');
    const upload = { originalname: "test.pdf", mimetype: "application/pdf", size: bytes.length, buffer: bytes };
    const clientDoc = await service.addDocument(clientId, null, upload, null, actorId);
    const requestDoc = await service.addDocument(clientId, requestId, upload, null, actorId);
    const docId = Number(clientDoc.id);
    assert.deepEqual((await service.downloadDocument(docId, actorId, ["records.read"], "view")).content, bytes);
    assert.equal((await db.query("SELECT action FROM sensitive_access_events WHERE resource_type='entity_document' AND resource_id=$1 ORDER BY id DESC LIMIT 1", [clientDoc.id])).rows[0].action, "view");
    await assert.rejects(() => service.downloadDocument(Number(requestDoc.id), otherId, ["records.read"], "view"), (e) => e.getStatus() === 403);
    await assert.rejects(() => service.deleteDocument(docId, actorId, ["records.read"]), (e) => e.getStatus() === 403);
    await assert.rejects(() => service.deleteDocument(Number(requestDoc.id), otherId, ["records.write"]), (e) => e.getStatus() === 403);
    failAudit = true;
    await assert.rejects(() => service.deleteDocument(docId, actorId, ["records.write"]), /Simulated audit failure/);
    failAudit = false;
    assert.equal((await service.listDocuments(clientId, null)).length, 1, "audit failure must roll back removal");
    await service.deleteDocument(docId, actorId, ["records.write"]);
    assert.equal((await service.listDocuments(clientId, null)).length, 0);
    for (const action of ["view", "download"]) {
      await assert.rejects(() => service.downloadDocument(docId, actorId, ["records.read"], action), (e) => e.getStatus() === 404);
    }
    await assert.rejects(() => service.deleteDocument(docId, actorId, ["records.write"]), (e) => e.getStatus() === 404);
    const retained = (await db.query("SELECT content,deleted_by,deleted_at FROM entity_documents WHERE id=$1", [docId])).rows[0];
    assert.deepEqual(retained.content, bytes);
    assert.equal(retained.deleted_by, actorId);
    assert.ok(retained.deleted_at);
    const audit = (await db.query("SELECT before_state,after_state FROM audit_events WHERE entity_type='entity_document' AND entity_id=$1 AND action='entity_document.deleted'", [clientDoc.id])).rows;
    assert.equal(audit.length, 1);
    assert.equal(audit[0].before_state.fileName, "test.pdf");
    assert.equal(audit[0].after_state.recoverable, true);
    assert.ok((await service.activity(clientId, null)).some((item) => item.title === "Document deleted: test.pdf"));
    assert.equal((await service.listDocuments(clientId, requestId)).length, 1, "other scopes remain unchanged");
    await service.deleteDocument(Number(requestDoc.id), otherId, ["records.write", "requests.assign_any"]);
    assert.equal((await service.listDocuments(clientId, requestId)).length, 0);
    console.log("Attachment preview, permission/ownership checks, recoverable deletion, audit rollback, deleted-file access and history tests passed.");
  } finally { await db.query("ROLLBACK"); db.release(); await pool.end(); }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
