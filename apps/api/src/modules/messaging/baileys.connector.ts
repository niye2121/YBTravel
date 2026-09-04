import * as fs from "fs/promises";
import * as path from "path";
import { createHash } from "node:crypto";
import { Injectable, Logger } from "@nestjs/common";
import type { WASocket } from "@whiskeysockets/baileys";
import pino from "pino";
import qrcodeTerminal from "qrcode-terminal";
import type {
  ConnectionStatus, CreatedGroup, InboundMessage, MessageHandler, MessagingChannel,
  NameHandler, ResolvedDirectRecipient, StatusHandler, VoiceNotePayload,
} from "./messaging-channel.interface";

const pinoLogger = pino({ level: "warn" });
const importBaileys = new Function("specifier", "return import(specifier)") as (
  specifier: string,
) => Promise<typeof import("@whiskeysockets/baileys")>;
let baileysModulePromise: ReturnType<typeof importBaileys> | null = null;
function loadBaileys() {
  if (!baileysModulePromise) baileysModulePromise = importBaileys("@whiskeysockets/baileys");
  return baileysModulePromise;
}

type AccountRuntime = {
  id: number; authKey: string; socket: WASocket | null; status: ConnectionStatus;
  qr: string | null; phoneNumber: string | null; connecting: boolean; generation: number;
};

/**
 * The original linked session keeps using `.baileys-auth` unchanged. Each
 * additional profile has an isolated directory and socket below
 * `.baileys-auth/accounts`, so pairing one cannot replace another.
 */
@Injectable()
export class BaileysConnector implements MessagingChannel {
  private readonly logger = new Logger(BaileysConnector.name);
  private readonly runtimes = new Map<number, AccountRuntime>();
  private readonly statusHandlers: StatusHandler[] = [];
  private readonly messageHandlers: MessageHandler[] = [];
  private readonly nameHandlers: NameHandler[] = [];
  private readonly knownNames = new Map<string, string>();

  async initializeAccount(account: { id: number; authKey: string }): Promise<void> {
    if (this.runtimes.has(account.id)) return;
    if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(account.authKey)) {
      throw new Error(`Invalid WhatsApp authentication key for account ${account.id}`);
    }
    this.runtimes.set(account.id, {
      id: account.id, authKey: account.authKey, socket: null, status: "disconnected",
      qr: null, phoneNumber: null, connecting: false, generation: 0,
    });
    try { await this.reconnect(account.id); }
    catch (error) { this.logger.error(`Account ${account.id} failed to initialize: ${(error as Error).message}`); }
  }

  private runtime(accountId: number): AccountRuntime {
    const runtime = this.runtimes.get(accountId);
    if (!runtime) throw new Error(`WhatsApp account ${accountId} is not initialized`);
    return runtime;
  }

  private authDir(runtime: AccountRuntime): string {
    const root = path.join(process.cwd(), ".baileys-auth");
    return runtime.authKey === "primary" ? root : path.join(root, "accounts", runtime.authKey);
  }

  async reconnect(accountId: number): Promise<void> {
    const runtime = this.runtime(accountId);
    if (runtime.connecting || runtime.status === "connected") return;
    if (runtime.status === "qr_pending" && runtime.qr && runtime.socket) return;
    const staleSocket = runtime.socket;
    if (staleSocket) {
      runtime.generation += 1;
      runtime.socket = null;
      try { staleSocket.end(new Error("WhatsApp connection retry requested")); }
      catch (error) { this.logger.warn(`Could not close account ${accountId}: ${(error as Error).message}`); }
    }
    runtime.status = "disconnected";
    runtime.qr = null;
    runtime.phoneNumber = null;
    this.emitStatus(runtime);
    runtime.connecting = true;
    try { await this.connect(runtime); }
    finally { runtime.connecting = false; }
  }

  async disconnect(accountId: number): Promise<void> {
    const runtime = this.runtime(accountId);
    const socket = runtime.socket;
    runtime.generation += 1;
    runtime.socket = null;
    runtime.status = "disconnected";
    runtime.qr = null;
    runtime.phoneNumber = null;
    this.emitStatus(runtime);
    if (socket) {
      try { await socket.logout(); }
      catch (error) { this.logger.warn(`Logout failed for account ${accountId}; replacing credentials: ${(error as Error).message}`); }
    }
    await this.preserveInvalidAuthState(this.authDir(runtime), runtime.authKey === "primary");
    await this.reconnect(accountId);
  }

  private async preserveInvalidAuthState(authDir: string, primary: boolean): Promise<void> {
    await fs.mkdir(authDir, { recursive: true });
    const entries = (await fs.readdir(authDir, { withFileTypes: true })).filter(
      (entry) => entry.name !== ".backups" && (!primary || entry.name !== "accounts"),
    );
    if (!entries.length) return;
    const backupDir = path.join(authDir, ".backups", new Date().toISOString().replace(/[:.]/g, "-"));
    await fs.mkdir(backupDir, { recursive: true });
    for (const entry of entries) {
      try { await fs.rename(path.join(authDir, entry.name), path.join(backupDir, entry.name)); }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
    }
  }

  private async connect(runtime: AccountRuntime): Promise<void> {
    const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, downloadMediaMessage, normalizeMessageContent } = await loadBaileys();
    const authDir = this.authDir(runtime);
    const { state, saveCreds } = await useMultiFileAuthState(authDir);
    const socket = makeWASocket({ auth: state, logger: pinoLogger });
    const generation = ++runtime.generation;
    runtime.socket = socket;
    socket.ev.on("creds.update", saveCreds);
    socket.ev.on("connection.update", (update) => {
      if (generation !== runtime.generation) return;
      const { connection, lastDisconnect, qr } = update;
      if (qr) {
        runtime.qr = qr; runtime.status = "qr_pending";
        qrcodeTerminal.generate(qr, { small: true });
        this.emitStatus(runtime);
      }
      if (connection === "open") {
        runtime.status = "connected"; runtime.qr = null;
        runtime.phoneNumber = socket.user?.id?.split(":")[0] ?? null;
        this.logger.log(`Account ${runtime.id} connected: ${runtime.phoneNumber ?? "unknown number"}`);
        this.emitStatus(runtime);
        socket.groupFetchAllParticipating()
          .then((groups) => Object.values(groups).forEach((group) => this.rememberName(runtime.id, group.id, group.subject)))
          .catch((error) => this.logger.warn(`Could not refresh account ${runtime.id} groups: ${(error as Error).message}`));
      }
      if (connection === "close") {
        const withStatus = lastDisconnect?.error as { output?: { statusCode?: number } } | undefined;
        const loggedOut = withStatus?.output?.statusCode === DisconnectReason.loggedOut;
        runtime.socket = null; runtime.generation += 1; runtime.status = "disconnected"; runtime.qr = null;
        this.emitStatus(runtime);
        if (!loggedOut) {
          this.reconnect(runtime.id).catch((error) => this.logger.error(`Account ${runtime.id} reconnect failed: ${(error as Error).message}`));
        } else {
          this.preserveInvalidAuthState(authDir, runtime.authKey === "primary")
            .then(() => this.reconnect(runtime.id))
            .catch((error) => this.logger.error(`Could not replace account ${runtime.id} session: ${(error as Error).message}`));
        }
      }
    });

    const rememberContacts = (contacts: Array<{ id?: string; jid?: string; lid?: string; name?: string; notify?: string; verifiedName?: string }>) => {
      for (const contact of contacts) {
        const displayName = contact.name ?? contact.verifiedName ?? contact.notify;
        if (!displayName) continue;
        [contact.id, contact.jid, contact.lid].filter((jid): jid is string => Boolean(jid))
          .forEach((jid) => this.rememberName(runtime.id, jid, displayName));
      }
    };
    socket.ev.on("messaging-history.set", ({ contacts }) => rememberContacts(contacts));
    socket.ev.on("contacts.upsert", rememberContacts);
    socket.ev.on("contacts.update", rememberContacts);
    socket.ev.on("groups.upsert", (groups) => groups.forEach((group) => this.rememberName(runtime.id, group.id, group.subject)));
    socket.ev.on("groups.update", (groups) => groups.forEach((group) => { if (group.id && group.subject) this.rememberName(runtime.id, group.id, group.subject); }));
    socket.ev.on("messages.upsert", ({ messages }) => {
      void (async () => {
        for (const msg of messages) {
          if (msg.key.fromMe) continue;
          const jid = msg.key.remoteJid;
          if (!jid) continue;
          const content = normalizeMessageContent(msg.message);
          const text = content?.conversation ?? content?.extendedTextMessage?.text ?? null;
          const audioMessage = content?.audioMessage ?? null;
          if (!text && !audioMessage) continue;
          let audio: InboundMessage["audio"] = null;
          let body = text ?? (audioMessage?.ptt ? "[Voice note]" : "[Audio message]");
          if (audioMessage) {
            try {
              const data = await downloadMediaMessage(msg, "buffer", {}, { logger: pinoLogger, reuploadRequest: socket.updateMediaMessage });
              if (data.length > 10 * 1024 * 1024) body = "[Voice note unavailable: file exceeds 10 MB]";
              else audio = { data, mimeType: audioMessage.mimetype?.trim() || "audio/ogg; codecs=opus", sizeBytes: data.length,
                sha256: createHash("sha256").update(data).digest("hex"), durationSeconds: audioMessage.seconds == null ? null : Number(audioMessage.seconds) };
            } catch (error) {
              body = "[Voice note unavailable: download failed]";
              this.logger.warn(`Could not download account ${runtime.id} voice note: ${(error as Error).message}`);
            }
          }
          const phoneNumber = jid.split("@")[0] ?? jid;
          const isGroup = jid.endsWith("@g.us");
          if (!isGroup && msg.pushName) this.rememberName(runtime.id, jid, msg.pushName);
          const providerMessageId = msg.key.id ?? createHash("sha256").update(`${runtime.id}|${jid}|${String(msg.messageTimestamp ?? "")}|${body}`).digest("hex");
          this.messageHandlers.forEach((handler) => handler({ accountId: runtime.id, providerMessageId, jid, phoneNumber,
            displayName: this.knownNames.get(this.nameKey(runtime.id, jid)) ?? (!isGroup ? msg.pushName?.trim() || null : null),
            body, senderJid: msg.key.participant ?? jid, messageType: audioMessage ? "audio" : "text", audio }));
        }
      })().catch((error) => this.logger.error(`Failed to process account ${runtime.id} messages: ${(error as Error).message}`));
    });
  }

  private nameKey(accountId: number, jid: string): string { return `${accountId}:${jid}`; }
  private rememberName(accountId: number, jid: string, value: string): void {
    const displayName = value.trim();
    const key = this.nameKey(accountId, jid);
    if (!displayName || this.knownNames.get(key) === displayName) return;
    this.knownNames.set(key, displayName);
    this.nameHandlers.forEach((handler) => handler({ accountId, jid, displayName }));
  }
  private emitStatus(runtime: AccountRuntime): void { this.statusHandlers.forEach((handler) => handler(runtime.id, runtime.status, runtime.qr, runtime.phoneNumber)); }
  getStatus(accountId: number): ConnectionStatus { return this.runtime(accountId).status; }
  getPhoneNumber(accountId: number): string | null { return this.runtime(accountId).phoneNumber; }
  getQrCode(accountId: number): string | null { return this.runtime(accountId).qr; }
  onStatusChange(handler: StatusHandler): void { this.statusHandlers.push(handler); }
  onMessage(handler: MessageHandler): void { this.messageHandlers.push(handler); }
  onNameChange(handler: NameHandler): void { this.nameHandlers.push(handler); }

  async resolveDirectRecipient(accountId: number, phoneNumber: string): Promise<ResolvedDirectRecipient | null> {
    const runtime = this.runtime(accountId);
    if (!runtime.socket || runtime.status !== "connected") throw new Error("WhatsApp account is not connected");
    const registration = (await runtime.socket.onWhatsApp(phoneNumber))?.[0];
    if (!registration?.exists || !registration.jid) return null;
    return { jid: registration.jid, phoneNumber, displayName: this.knownNames.get(this.nameKey(accountId, registration.jid)) ?? null };
  }
  async sendMessage(accountId: number, jid: string, text: string): Promise<{ providerMessageId: string }> {
    const runtime = this.runtime(accountId);
    if (!runtime.socket || runtime.status !== "connected") throw new Error("WhatsApp account is not connected");
    const result = await runtime.socket.sendMessage(jid, { text });
    if (!result?.key?.id) throw new Error("WhatsApp did not return a provider message ID");
    return { providerMessageId: result.key.id };
  }
  async sendVoiceNote(accountId: number, jid: string, voiceNote: VoiceNotePayload): Promise<{ providerMessageId: string }> {
    const runtime = this.runtime(accountId);
    if (!runtime.socket || runtime.status !== "connected") throw new Error("WhatsApp account is not connected");
    const result = await runtime.socket.sendMessage(jid, { audio: voiceNote.data, mimetype: voiceNote.mimeType, ptt: true,
      ...(voiceNote.durationSeconds ? { seconds: voiceNote.durationSeconds } : {}) });
    if (!result?.key?.id) throw new Error("WhatsApp did not return a provider message ID");
    return { providerMessageId: result.key.id };
  }
  async createGroup(accountId: number, name: string, participantPhoneNumbers: string[]): Promise<CreatedGroup> {
    const runtime = this.runtime(accountId);
    if (!runtime.socket || runtime.status !== "connected") throw new Error("WhatsApp account is not connected");
    const participating = await runtime.socket.groupFetchAllParticipating();
    const existing = Object.values(participating).find((group) => group.subject === name);
    if (existing) { this.rememberName(accountId, existing.id, existing.subject); return { jid: existing.id, name: existing.subject, reusedExisting: true }; }
    const jids = participantPhoneNumbers.map((number) => `${number}@s.whatsapp.net`);
    const registrations = await runtime.socket.onWhatsApp(...jids);
    if (registrations) {
      const registered = new Set(registrations.filter((item) => Boolean(item.exists)).map((item) => item.jid));
      const missing = participantPhoneNumbers.filter((number) => !registered.has(`${number}@s.whatsapp.net`));
      if (missing.length) throw new Error(`Not registered on WhatsApp: ${missing.map((number) => `+${number}`).join(", ")}`);
    }
    const group = await runtime.socket.groupCreate(name, jids);
    this.rememberName(accountId, group.id, group.subject);
    return { jid: group.id, name: group.subject, reusedExisting: false };
  }
}
