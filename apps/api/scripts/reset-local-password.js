require("dotenv").config();

const crypto = require("node:crypto");
const bcrypt = require("bcryptjs");
const { Pool } = require("pg");

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("This local recovery command is disabled in production");
  }
  const email = (argument("--email") || "").trim().toLowerCase();
  if (!email) throw new Error("Usage: npm run auth:reset-local-password -- --email user@example.com");
  const password = `YB-${crypto.randomBytes(15).toString("base64url")}!9`;
  const passwordHash = await bcrypt.hash(password, 12);
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const updated = await client.query(
      "UPDATE users SET password_hash = $2 WHERE lower(email) = $1 AND active = true RETURNING id",
      [email, passwordHash],
    );
    if ((updated.rowCount || 0) !== 1) throw new Error("Active local employee account not found");
    // Login keys intentionally do not retain reversible email/IP data. Local
    // recovery clears current throttles after the operator confirms the user.
    await client.query("DELETE FROM auth_login_attempts");
    await client.query("COMMIT");
    console.log(`Email: ${email}`);
    console.log(`Temporary password: ${password}`);
    console.log("Store it securely and change it after signing in.");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
