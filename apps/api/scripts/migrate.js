require("dotenv").config();
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");

/**
 * Creating a user requires an admin to be logged in — but the users table
 * starts empty, so nothing could ever log in. This breaks that deadlock:
 * on a fresh (empty) users table, generate one System Administrator account
 * with a random password and print it once. Safe to run on every
 * migration/deploy — it only fires when the table is empty, so it never
 * touches real accounts once one exists.
 */
async function seedAdminIfNeeded(pool) {
  const { rows } = await pool.query("SELECT COUNT(*)::int AS count FROM users");
  if (rows[0].count > 0) return;

  const email = "admin@ybtravel.com";
  const password = crypto.randomBytes(9).toString("base64url");
  const passwordHash = await bcrypt.hash(password, 12);

  await pool.query(
    "INSERT INTO users (name, email, password_hash, roles) VALUES ($1, $2, $3, $4)",
    ["System Administrator", email, passwordHash, ["system_administrator"]],
  );

  console.log("\n=== Seed admin account created ===");
  console.log(`Email:    ${email}`);
  console.log(`Password: ${password}`);
  console.log("Save this now — it will not be shown again. Log in and create");
  console.log("named accounts for real staff, then consider changing this one.");
  console.log("===================================\n");
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const sql = fs.readFileSync(
    path.join(__dirname, "..", "src", "database", "schema.sql"),
    "utf8",
  );
  await pool.query(sql);
  console.log("Schema applied.");
  await seedAdminIfNeeded(pool);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
