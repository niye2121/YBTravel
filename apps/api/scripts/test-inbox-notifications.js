require("dotenv").config();
const assert = require("node:assert/strict");
const { Pool } = require("pg");
const { ConversationsService } = require("../dist/modules/messaging/conversations.service");
const { NotificationsService } = require("../dist/modules/notifications/notifications.service");

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = await pool.connect();
  await db.query("BEGIN");
  // Run real service transactions as savepoints; all fixtures and alerts roll back.
  const adapter = { query: (...args) => db.query(...args), connect: async () => ({ release() {}, query: (sql, args) =>
    db.query(sql === "BEGIN" ? "SAVEPOINT service_tx" : sql === "COMMIT" ? "RELEASE SAVEPOINT service_tx" : sql === "ROLLBACK" ? "ROLLBACK TO SAVEPOINT service_tx" : sql, args) }) };
  try {
    const stamp = Date.now();
    const ids = [];
    for (const role of ["travel_agent", "system_administrator", "travel_agent", "travel_agent"]) {
      ids.push((await db.query("INSERT INTO users (name,email,password_hash,roles) VALUES ($1,$2,'unused',$3) RETURNING id",
        ["Inbox notification test", `inbox-${stamp}-${ids.length}@example.test`, [role]])).rows[0].id);
    }
    const [agent, grantedAdmin, revokedAgent, inactiveAgent] = ids;
    await db.query("INSERT INTO user_permission_overrides (user_id,permission_code,granted) VALUES ($1,'whatsapp.read',true),($2,'whatsapp.read',false)", [grantedAdmin, revokedAgent]);
    await db.query("UPDATE users SET active=false WHERE id=$1", [inactiveAgent]);
    const account = (await db.query("SELECT id FROM whatsapp_connections ORDER BY id LIMIT 1")).rows[0].id;
    const messages = new ConversationsService(adapter);
    const notifications = new NotificationsService(adapter);
    const conversation = await messages.findOrCreateConversation(account, `inbox-test-${stamp}@s.whatsapp.net`, "15550000000", "Inbox Test");
    const first = await messages.appendInboundMessage(conversation, "Private body must not appear in alert previews", "sender", `inbox-${stamp}-1`);
    const duplicate = await messages.appendInboundMessage(conversation, "duplicate", "sender", `inbox-${stamp}-1`);
    assert.equal(duplicate.created, false);
    assert.equal(duplicate.id, first.id);
    assert.equal((await notifications.list(agent, true)).inboxUnreadByConversation[conversation], 1);
    assert.equal((await notifications.list(grantedAdmin, true)).inboxUnreadByConversation[conversation], 1);
    assert.equal((await notifications.list(revokedAgent, true)).inboxUnreadCount, 0);
    assert.equal((await notifications.list(inactiveAgent, true)).inboxUnreadCount, 0);
    assert.equal((await notifications.list(agent, false)).notifications.length, 0, "revoked access hides saved message alerts");
    assert.equal((await notifications.list(agent, false)).unreadCount, 0);
    const second = await messages.appendInboundMessage(conversation, "voice note", "sender", `inbox-${stamp}-2`, "audio");
    let saved = await notifications.list(agent, true);
    assert.equal(saved.inboxUnreadCount, 2);
    assert.ok(saved.notifications.some(n => n.message.includes("voice note")));
    assert.ok(saved.notifications.every(n => !n.message.includes("Private body")));
    await notifications.readConversation(agent, conversation, first.id);
    assert.equal((await notifications.list(agent, true)).inboxUnreadCount, 1, "reading first message must not clear a later arrival");
    assert.equal((await notifications.list(grantedAdmin, true)).inboxUnreadCount, 2, "read state is per employee");
    await notifications.readConversation(agent, conversation, second.id);
    assert.equal((await notifications.list(agent, true)).inboxUnreadCount, 0);
    assert.equal((await new NotificationsService(adapter).list(agent, true)).inboxUnreadCount, 0, "read state survives service recreation");
    await messages.createOutboundMessage(conversation, "outbound");
    assert.equal((await notifications.list(grantedAdmin, true)).inboxUnreadCount, 2, "outbound messages do not create alerts");
    saved = await notifications.list(grantedAdmin, true);
    await assert.rejects(notifications.markRead(saved.notifications[0].id, agent, true), /not found/i);
    await assert.rejects(notifications.markRead(saved.notifications[0].id, grantedAdmin, false), /not found/i);
    await notifications.markAllRead(grantedAdmin);
    assert.equal((await notifications.list(grantedAdmin, true)).inboxUnreadCount, 0);
    console.log("PASS: durable inbound alerts, deduplication, permissions, audio, privacy, per-user reads, arrival races, outbound exclusion, and mark-all-read.");
  } finally {
    await db.query("ROLLBACK"); db.release(); await pool.end();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
