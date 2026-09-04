require("dotenv").config();
const fs = require("fs");
const os = require("os");
const path = require("path");
const { decryptFile } = require("./backup-crypto");
const { dockerDatabaseArgs, runPostgresTool } = require("./postgres-tools");

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}
if (!process.argv.includes("--confirm-restore")) {
  throw new Error("Restore replaces database objects. Re-run with --confirm-restore after verifying the target DATABASE_URL.");
}
const inputPath = argument("--input");
if (!inputPath) throw new Error("--input /path/to/backup.dump.enc is required");
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "yb-travel-restore-"));
const dumpPath = path.join(tempDir, "database.dump");
try {
  decryptFile(path.resolve(inputPath), dumpPath);
  const dockerService = process.env.POSTGRES_TOOL_DOCKER_SERVICE?.trim();
  const dump = dockerService ? fs.readFileSync(dumpPath) : undefined;
  const verify = runPostgresTool("pg_restore", dockerService ? ["--list"] : ["--list", dumpPath], { input: dump, encoding: "utf8" });
  if (verify.status !== 0) throw new Error(verify.stderr || "Backup verification failed before restore");
  const restoreArgs = ["--clean", "--if-exists", "--no-owner", "--no-acl"];
  if (dockerService) restoreArgs.push(...dockerDatabaseArgs(process.env.DATABASE_URL));
  else restoreArgs.push("--dbname", process.env.DATABASE_URL, dumpPath);
  const restore = runPostgresTool("pg_restore", restoreArgs, { input: dump, inherit: !dockerService });
  if (restore.status !== 0) throw new Error(`pg_restore failed with exit code ${restore.status ?? "unknown"}`);
  console.log("Database restore completed. Run migrations and the security regression suite before reopening access.");
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
