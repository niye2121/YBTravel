require("dotenv").config();

const assert = require("node:assert/strict");
const { Pool } = require("pg");
const { ClientsService } = require("../dist/modules/clients/clients.service");

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const service = new ClientsService(pool, {
    recordInitialStage: async () => {},
    applyStageTransition: async () => {},
  });
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const digits = `1555${stamp.slice(-7)}`;
  const formattedPhone = `+1 (555) ${digits.slice(-7, -4)}-${digits.slice(-4)}`;
  let clientId;
  let conversationA;
  let conversationB;

  try {
    const [actorResult, feeResult] = await Promise.all([
      pool.query("SELECT id FROM users ORDER BY id LIMIT 1"),
      pool.query("SELECT id FROM booking_fee_groups WHERE active = true ORDER BY id LIMIT 1"),
    ]);
    const accountId = (await pool.query("SELECT id FROM whatsapp_connections WHERE is_primary = true")).rows[0]?.id;
    const actorId = actorResult.rows[0]?.id;
    const bookingFeeGroupId = feeResult.rows[0]?.id;
    if (!actorId || !accountId || !bookingFeeGroupId) {
      throw new Error("Client duplicate test requires one user, the Primary WhatsApp account, and one active booking fee group");
    }

    conversationA = (await pool.query(
      "INSERT INTO conversations (whatsapp_connection_id, whatsapp_jid, phone_number) VALUES ($1, $2, $3) RETURNING id",
      [accountId, `duplicate-a-${stamp}@s.whatsapp.net`, digits],
    )).rows[0].id;
    conversationB = (await pool.query(
      "INSERT INTO conversations (whatsapp_connection_id, whatsapp_jid, phone_number) VALUES ($1, $2, $3) RETURNING id",
      [accountId, `duplicate-b-${stamp}@s.whatsapp.net`, formattedPhone],
    )).rows[0].id;

    const input = {
      name: `Duplicate Test ${stamp}`,
      clientType: "individual",
      phoneNumber: formattedPhone,
      bookingFeeGroupId,
      conversationId: conversationA,
    };
    const created = await service.create(input, actorId);
    clientId = created.id;

    const repeated = await service.create({ ...input, name: "Ignored duplicate name" }, actorId);
    assert.equal(repeated.id, clientId, "repeated Inbox submission must reuse the linked client");

    const reused = await service.create(
      { ...input, conversationId: conversationB, name: "Another duplicate name" },
      actorId,
    );
    assert.equal(reused.id, clientId, "another conversation with the same phone must reuse the client");

    const links = await pool.query(
      "SELECT id, client_id FROM conversations WHERE id = ANY($1::int[]) ORDER BY id",
      [[conversationA, conversationB]],
    );
    assert.deepEqual(links.rows.map((row) => row.client_id), [clientId, clientId]);

    await assert.rejects(
      service.create({ ...input, conversationId: undefined, name: "Direct duplicate" }, actorId),
      (error) => error?.status === 409,
      "ordinary client creation must reject a duplicate phone",
    );

    await assert.rejects(
      pool.query(
        `INSERT INTO clients (name, client_type, phone_number, booking_fee_group_id)
         VALUES ($1, 'individual', $2, $3)`,
        ["Database bypass duplicate", digits, bookingFeeGroupId],
      ),
      (error) => error?.code === "23505" && error?.constraint === "clients_phone_digits_unique",
      "database trigger must reject a normalized duplicate phone",
    );

    const count = await pool.query(
      `SELECT count(*)::int AS count FROM clients
       WHERE NOT is_demo AND regexp_replace(COALESCE(phone_number, ''), '[^0-9]', '', 'g') = $1`,
      [digits],
    );
    assert.equal(count.rows[0].count, 1);
    console.log("Client duplicate-phone prevention checks passed");
  } finally {
    const conversationIds = [conversationA, conversationB].filter(Boolean);
    if (conversationIds.length) {
      await pool.query(
        "DELETE FROM audit_events WHERE entity_type = 'conversation' AND entity_id = ANY($1::text[])",
        [conversationIds.map(String)],
      );
      await pool.query("DELETE FROM conversations WHERE id = ANY($1::int[])", [conversationIds]);
    }
    if (clientId) {
      await pool.query("DELETE FROM audit_events WHERE entity_type = 'client' AND entity_id = $1", [String(clientId)]);
      await pool.query("DELETE FROM clients WHERE id = $1", [clientId]);
    }
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
