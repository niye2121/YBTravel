require("dotenv").config();
const assert = require("node:assert/strict");
const path = require("node:path");
const { Pool } = require("pg");
const { BaileysConnector } = require("../dist/modules/messaging/baileys.connector");

async function run() {
  const connector = new BaileysConnector();
  const originalCwd = process.cwd();
  const primary = { id: 1, authKey: "primary", socket: null, status: "disconnected", qr: null, phoneNumber: null, connecting: false, generation: 0 };
  const secondary = { ...primary, id: 27, authKey: "account-27" };
  assert.equal(connector.authDir(primary), path.join(originalCwd, ".baileys-auth"));
  assert.equal(connector.authDir(secondary), path.join(originalCwd, ".baileys-auth", "accounts", "account-27"));

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const primaryRow = await client.query("SELECT id FROM whatsapp_connections WHERE is_primary = true");
    assert.equal(primaryRow.rowCount, 1, "exactly one Primary account must exist");
    const primaryId = primaryRow.rows[0].id;
    const assignment = await client.query(
      `SELECT (SELECT count(*) FROM conversations WHERE whatsapp_connection_id IS NULL)::int AS missing_conversations,
              (SELECT count(*) FROM whatsapp_groups WHERE whatsapp_connection_id IS NULL)::int AS missing_groups`,
    );
    assert.deepEqual(assignment.rows[0], { missing_conversations: 0, missing_groups: 0 });

    const account = await client.query(
      `INSERT INTO whatsapp_connections (id, label, status, auth_key, is_primary)
       SELECT nextval('whatsapp_connections_id_seq'), 'Isolation test account', 'disconnected',
              'pending-' || currval('whatsapp_connections_id_seq')::text, false
       RETURNING id`,
    );
    await client.query("UPDATE whatsapp_connections SET auth_key = $2 WHERE id = $1", [account.rows[0].id, `account-${account.rows[0].id}`]);
    const existing = await client.query("SELECT whatsapp_jid, phone_number FROM conversations LIMIT 1");
    if (existing.rows[0]) {
      const duplicate = await client.query(
        `INSERT INTO conversations (whatsapp_connection_id, whatsapp_jid, phone_number)
         VALUES ($1, $2, $3) RETURNING id`,
        [account.rows[0].id, existing.rows[0].whatsapp_jid, existing.rows[0].phone_number],
      );
      assert.equal(duplicate.rowCount, 1, "the same contact must be allowed on a different WhatsApp account");
      await assert.rejects(
        () => client.query(
          `INSERT INTO conversations (whatsapp_connection_id, whatsapp_jid, phone_number)
           VALUES ($1, $2, $3)`,
          [primaryId, existing.rows[0].whatsapp_jid, existing.rows[0].phone_number],
        ),
        /duplicate key value/,
      );
    }
    await client.query("ROLLBACK");
    console.log("WhatsApp multi-account isolation checks passed");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((error) => { console.error(error); process.exitCode = 1; });
