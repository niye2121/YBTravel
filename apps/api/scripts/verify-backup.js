require("dotenv").config();
const fs = require("fs");
const os = require("os");
const path = require("path");
const { decryptFile } = require("./backup-crypto");
const { runPostgresTool } = require("./postgres-tools");

const inputIndex = process.argv.indexOf("--input");
const inputPath = inputIndex >= 0 ? process.argv[inputIndex + 1] : undefined;
if (!inputPath) throw new Error("Usage: npm run db:verify-backup -- --input /path/to/backup.dump.enc");
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "yb-travel-verify-"));
const dumpPath = path.join(tempDir, "database.dump");
try {
  decryptFile(path.resolve(inputPath), dumpPath);
  const dockerService = process.env.POSTGRES_TOOL_DOCKER_SERVICE?.trim();
  const result = runPostgresTool("pg_restore", dockerService ? ["--list"] : ["--list", dumpPath], {
    input: dockerService ? fs.readFileSync(dumpPath) : undefined,
    encoding: "utf8",
  });
  if (result.status !== 0) throw new Error(result.stderr || "pg_restore could not read the backup");
  const entries = result.stdout.split("\n").filter((line) => line && !line.startsWith(";")).length;
  if (entries === 0) throw new Error("Backup contains no restore entries");
  console.log(`Backup verified: ${entries} restore entries`);
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
