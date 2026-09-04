require("dotenv").config();

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");
const bcrypt = require("bcryptjs");
const { Pool } = require("pg");
const { AuthService } = require("../dist/modules/auth/auth.service");
const { ConversationsService } = require("../dist/modules/messaging/conversations.service");
const { TravellersService } = require("../dist/modules/travellers/travellers.service");
const { securityHeaders } = require("../dist/security/http-security");
const { encryptFile, decryptFile } = require("./backup-crypto");

async function main() {
  assert.equal(securityHeaders(false)["X-Content-Type-Options"], "nosniff");
  assert.equal(securityHeaders(false)["Strict-Transport-Security"], undefined);
  assert.match(securityHeaders(true)["Strict-Transport-Security"], /max-age=31536000/);

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "yb-security-"));
  const source = path.join(tmp, "source");
  const encrypted = path.join(tmp, "backup.enc");
  const restored = path.join(tmp, "restored");
  fs.writeFileSync(source, "backup-integrity-check");
  encryptFile(source, encrypted);
  decryptFile(encrypted, restored);
  assert.equal(fs.readFileSync(restored, "utf8"), "backup-integrity-check");
  fs.rmSync(tmp, { recursive: true, force: true });

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const auth = new AuthService(pool);
  const conversations = new ConversationsService(pool);
  const travellers = new TravellersService(pool);
  const stamp = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  let userId;
  let conversationId;
  let travellerId;
  let lockedKey;
  try {
    const password = `Secure-${stamp}!`;
    const user = await pool.query(
      `INSERT INTO users (name, email, password_hash, roles, active)
       VALUES ($1, $2, $3, ARRAY['system_administrator'], true) RETURNING id`,
      ["Security Test", `security-${stamp}@example.test`, await bcrypt.hash(password, 4)],
    );
    userId = user.rows[0].id;
    const email = `security-${stamp}@example.test`;
    const safeUser = await auth.validateCredentials(email, password, `success-${stamp}`);
    assert.equal(safeUser.id, userId);
    const token = auth.signToken(safeUser);
    assert.equal((await auth.getUserFromToken(token)).id, userId);
    await pool.query("UPDATE users SET active = false WHERE id = $1", [userId]);
    assert.equal(await auth.getUserFromToken(token), null, "deactivation must invalidate existing sessions");
    await pool.query("UPDATE users SET active = true WHERE id = $1", [userId]);

    const maxFailures = Number(process.env.LOGIN_RATE_LIMIT_MAX_FAILURES || 5);
    lockedKey = crypto.createHmac("sha256", process.env.JWT_SECRET)
      .update(`${email}|locked-${stamp}`)
      .digest("hex");
    for (let i = 0; i < maxFailures; i += 1) {
      assert.equal(await auth.validateCredentials(email, "wrong-password", `locked-${stamp}`), null);
    }
    await assert.rejects(
      auth.validateCredentials(email, "wrong-password", `locked-${stamp}`),
      (error) => error?.status === 429,
      "login throttling must return HTTP 429",
    );

    conversationId = await conversations.findOrCreateConversation(
      `security-${stamp}@s.whatsapp.net`, `1555${String(Date.now()).slice(-7)}`, "Security Test",
    );
    const first = await conversations.appendInboundMessage(conversationId, "hello", "sender", `provider-${stamp}`);
    const duplicate = await conversations.appendInboundMessage(conversationId, "hello", "sender", `provider-${stamp}`);
    assert.equal(first.created, true);
    assert.equal(duplicate.created, false);
    assert.equal(first.id, duplicate.id);

    const outboundId = await conversations.createOutboundMessage(conversationId, "delivery test");
    const attempt = await conversations.startDeliveryAttempt(outboundId);
    await conversations.failDeliveryAttempt(outboundId, attempt, new Error("provider unavailable"), false);
    const failures = await conversations.getDeliveryFailures();
    assert.equal(failures.find((item) => item.id === outboundId)?.deliveryAttemptCount, 1);

    const insertedTraveller = await pool.query(
      `INSERT INTO travellers
         (name, passport_status, passport_number, passport_issuing_country, passport_expires_on)
       VALUES ($1, 'on_file', $2, 'US', '2035-01-01') RETURNING id`,
      [`Security Traveller ${stamp}`, `P-${stamp}`],
    );
    travellerId = insertedTraveller.rows[0].id;
    const summary = (await travellers.list()).find((item) => item.id === travellerId);
    assert.equal(summary.passportNumber, null, "list responses must redact passport details");
    const detail = await travellers.getById(travellerId, userId, "127.0.0.1", "security-test");
    assert.equal(detail.passportNumber, `P-${stamp}`);
    const history = await travellers.getSensitiveAccessHistory(travellerId);
    assert.equal(history[0].actorUserId, userId);

    console.log("Security regression tests passed");
  } finally {
    if (travellerId) await pool.query("DELETE FROM sensitive_access_events WHERE resource_type = 'traveller_passport' AND resource_id = $1", [String(travellerId)]);
    if (travellerId) await pool.query("DELETE FROM travellers WHERE id = $1", [travellerId]);
    if (conversationId) await pool.query("DELETE FROM conversations WHERE id = $1", [conversationId]);
    if (userId) await pool.query("DELETE FROM sensitive_access_events WHERE actor_user_id = $1", [userId]);
    if (userId) await pool.query("DELETE FROM users WHERE id = $1", [userId]);
    if (lockedKey) await pool.query("DELETE FROM auth_login_attempts WHERE key_hash = $1", [lockedKey]);
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
