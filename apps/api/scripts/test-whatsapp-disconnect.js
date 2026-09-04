const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { BaileysConnector } = require("../dist/modules/messaging/baileys.connector");

function runtime(id, authKey) {
  return { id, authKey, socket: null, status: "disconnected", qr: null, phoneNumber: null, connecting: false, generation: 0 };
}

async function testDisconnectOnlyTargetsSelectedAccount() {
  const connector = new BaileysConnector();
  const first = runtime(1, "primary");
  const second = runtime(2, "account-2");
  let firstLoggedOut = false;
  let secondLoggedOut = false;
  first.status = "connected";
  first.socket = { logout: async () => { firstLoggedOut = true; } };
  second.status = "connected";
  second.socket = { logout: async () => { secondLoggedOut = true; } };
  connector.runtimes.set(1, first);
  connector.runtimes.set(2, second);
  connector.preserveInvalidAuthState = async () => {};
  connector.reconnect = async (id) => {
    const selected = connector.runtimes.get(id);
    selected.status = "qr_pending";
    selected.qr = `fresh-qr-${id}`;
  };
  await connector.disconnect(2);
  assert.equal(firstLoggedOut, false, "disconnecting account 2 must not log out the primary session");
  assert.equal(first.status, "connected");
  assert.equal(secondLoggedOut, true);
  assert.equal(second.status, "qr_pending");
}

async function testPrimaryArchivePreservesOtherAccountDirectories() {
  const connector = new BaileysConnector();
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "yb-baileys-auth-"));
  const authDir = path.join(root, ".baileys-auth");
  await fs.mkdir(path.join(authDir, "accounts", "account-2"), { recursive: true });
  await fs.writeFile(path.join(authDir, "creds.json"), "retired primary credentials");
  await fs.writeFile(path.join(authDir, "accounts", "account-2", "creds.json"), "secondary credentials");
  try {
    await connector.preserveInvalidAuthState(authDir, true);
    assert.equal(await fs.readFile(path.join(authDir, "accounts", "account-2", "creds.json"), "utf8"), "secondary credentials");
    const backups = await fs.readdir(path.join(authDir, ".backups"));
    assert.equal(backups.length, 1);
    assert.equal(await fs.readFile(path.join(authDir, ".backups", backups[0], "creds.json"), "utf8"), "retired primary credentials");
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}

Promise.all([testDisconnectOnlyTargetsSelectedAccount(), testPrimaryArchivePreservesOtherAccountDirectories()])
  .then(() => console.log("WhatsApp per-account disconnect regression tests passed"))
  .catch((error) => { console.error(error); process.exitCode = 1; });
