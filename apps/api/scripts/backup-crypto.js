const crypto = require("crypto");
const fs = require("fs");

const MAGIC = Buffer.from("YBTRAVEL-BACKUP-V1\n", "utf8");

function encryptionKey() {
  const encoded = process.env.BACKUP_ENCRYPTION_KEY?.trim();
  if (!encoded) throw new Error("BACKUP_ENCRYPTION_KEY is required (base64-encoded 32-byte key)");
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32) throw new Error("BACKUP_ENCRYPTION_KEY must decode to exactly 32 bytes");
  return key;
}

function encryptFile(inputPath, outputPath) {
  const plaintext = fs.readFileSync(inputPath);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const payload = Buffer.concat([MAGIC, Buffer.from(`${iv.toString("base64")}\n`, "utf8"), ciphertext, cipher.getAuthTag()]);
  fs.writeFileSync(outputPath, payload, { mode: 0o600 });
}

function decryptFile(inputPath, outputPath) {
  const payload = fs.readFileSync(inputPath);
  if (!payload.subarray(0, MAGIC.length).equals(MAGIC)) throw new Error("Backup format or magic header is invalid");
  const ivEnd = payload.indexOf(10, MAGIC.length);
  if (ivEnd < 0 || payload.length <= ivEnd + 17) throw new Error("Backup payload is truncated");
  const iv = Buffer.from(payload.subarray(MAGIC.length, ivEnd).toString("utf8"), "base64");
  const tag = payload.subarray(payload.length - 16);
  const ciphertext = payload.subarray(ivEnd + 1, payload.length - 16);
  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  fs.writeFileSync(outputPath, plaintext, { mode: 0o600 });
}

module.exports = { decryptFile, encryptFile };
