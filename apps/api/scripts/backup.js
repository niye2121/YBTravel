require("dotenv").config();
const fs = require("fs");
const os = require("os");
const path = require("path");
const { encryptFile } = require("./backup-crypto");
const { dockerDatabaseArgs, runPostgresTool } = require("./postgres-tools");

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");
const outputDir = path.resolve(argument("--output") ?? path.join(process.cwd(), "backups"));
fs.mkdirSync(outputDir, { recursive: true, mode: 0o700 });
fs.chmodSync(outputDir, 0o700);
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const outputPath = path.join(outputDir, `yb-travel-${stamp}.dump.enc`);
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "yb-travel-backup-"));
const dumpPath = path.join(tempDir, "database.dump");

try {
  const dockerService = process.env.POSTGRES_TOOL_DOCKER_SERVICE?.trim();
  const args = ["--format=custom", "--no-owner", "--no-acl"];
  if (dockerService) args.push(...dockerDatabaseArgs(databaseUrl));
  else args.push("--file", dumpPath, databaseUrl);
  const result = runPostgresTool("pg_dump", args, { inherit: !dockerService });
  if (result.status !== 0) throw new Error(result.stderr?.toString() || `pg_dump failed with exit code ${result.status ?? "unknown"}`);
  if (dockerService) fs.writeFileSync(dumpPath, result.stdout, { mode: 0o600 });
  encryptFile(dumpPath, outputPath);
  console.log(`Encrypted backup created: ${outputPath}`);
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
