import * as fs from "fs/promises";
import * as path from "path";
import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import type { WASocket } from "@whiskeysockets/baileys";
import pino from "pino";
import qrcodeTerminal from "qrcode-terminal";
import type {
  ConnectionStatus,
  CreatedGroup,
  MessageHandler,
  MessagingChannel,
  NameHandler,
  StatusHandler,
} from "./messaging-channel.interface";

const pinoLogger = pino({ level: "warn" });

/**
 * @whiskeysockets/baileys ships as an ESM-only package ("type": "module"),
 * but this app compiles to CommonJS. A plain `import()` here would get
 * downleveled by tsc into `require()` under a commonjs target, which
 * throws ERR_REQUIRE_ESM — so this goes through the Function constructor
 * to force a genuine native dynamic import that tsc can't rewrite.
 */
const importBaileys = new Function(
  "specifier",
  "return import(specifier)",
) as (specifier: string) => Promise<typeof import("@whiskeysockets/baileys")>;

let baileysModulePromise: ReturnType<typeof importBaileys> | null = null;
function loadBaileys() {
  if (!baileysModulePromise) {
    baileysModulePromise = importBaileys("@whiskeysockets/baileys");
  }
  return baileysModulePromise;
}

/**
 * Wraps @whiskeysockets/baileys — an unofficial WhatsApp Web library, not
 * WhatsApp's sanctioned Business Platform API. Pair a separate/test number
 * here, not the production business number: see the risk note and
 * safeguards in docs/05-open-decisions.md #9 before pointing this at a
 * number YB Travel can't afford to lose.
 */
@Injectable()
export class BaileysConnector implements MessagingChannel, OnModuleInit {
  private readonly logger = new Logger(BaileysConnector.name);
  private socket: WASocket | null = null;
  private status: ConnectionStatus = "disconnected";
  private qr: string | null = null;
  private phoneNumber: string | null = null;
  private readonly statusHandlers: StatusHandler[] = [];
  private readonly messageHandlers: MessageHandler[] = [];
  private readonly nameHandlers: NameHandler[] = [];
  private readonly knownNames = new Map<string, string>();

  async onModuleInit(): Promise<void> {
    try {
      await this.connect();
    } catch (err) {
      this.logger.error(`Baileys failed to initialize: ${(err as Error).message}`);
    }
  }

  private async connect(): Promise<void> {
    const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = await loadBaileys();

    const authDir = path.join(process.cwd(), ".baileys-auth");
    const { state, saveCreds } = await useMultiFileAuthState(authDir);

    const socket = makeWASocket({
      auth: state,
      logger: pinoLogger,
    });
    this.socket = socket;

    socket.ev.on("creds.update", saveCreds);

    socket.ev.on("connection.update", (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        this.qr = qr;
        this.status = "qr_pending";
        qrcodeTerminal.generate(qr, { small: true });
        this.emitStatus();
      }

      if (connection === "open") {
        this.status = "connected";
        this.qr = null;
        this.phoneNumber = socket.user?.id?.split(":")[0] ?? null;
        this.logger.log(`WhatsApp connected: ${this.phoneNumber ?? "unknown number"}`);
        this.emitStatus();
        socket
          .groupFetchAllParticipating()
          .then((groups) => {
            Object.values(groups).forEach((group) => this.rememberName(group.id, group.subject));
          })
          .catch((err) =>
            this.logger.warn(`Could not refresh WhatsApp group names: ${(err as Error).message}`),
          );
      }

      if (connection === "close") {
        const errorWithStatus = lastDisconnect?.error as { output?: { statusCode?: number } } | undefined;
        const loggedOut = errorWithStatus?.output?.statusCode === DisconnectReason.loggedOut;
        this.status = "disconnected";
        this.qr = null;
        this.emitStatus();
        if (!loggedOut) {
          this.connect().catch((err) =>
            this.logger.error(`Baileys reconnect failed: ${(err as Error).message}`),
          );
        } else {
          // A real logout (device removed on the phone, or WhatsApp itself
          // ended the session) — the old credentials are dead and resuming
          // with them would just fail again. Clear them and reconnect so
          // Baileys generates a brand-new QR instead of leaving the Inbox
          // screen stuck on "disconnected" with no way to recover without
          // someone manually clearing files on the server.
          this.logger.warn("WhatsApp logged out — clearing stale session and requesting a new QR.");
          fs.rm(authDir, { recursive: true, force: true })
            .then(() => this.connect())
            .catch((err) =>
              this.logger.error(`Failed to reset session after logout: ${(err as Error).message}`),
            );
        }
      }
    });

    const rememberContacts = (
      contacts: Array<{
        id?: string;
        jid?: string;
        lid?: string;
        name?: string;
        notify?: string;
        verifiedName?: string;
      }>,
    ) => {
      for (const contact of contacts) {
        const displayName = contact.name ?? contact.verifiedName ?? contact.notify;
        if (!displayName) continue;
        [contact.id, contact.jid, contact.lid]
          .filter((jid): jid is string => Boolean(jid))
          .forEach((jid) => this.rememberName(jid, displayName));
      }
    };

    socket.ev.on("messaging-history.set", ({ contacts }) => rememberContacts(contacts));
    socket.ev.on("contacts.upsert", rememberContacts);
    socket.ev.on("contacts.update", rememberContacts);
    socket.ev.on("groups.upsert", (groups) => {
      groups.forEach((group) => this.rememberName(group.id, group.subject));
    });
    socket.ev.on("groups.update", (groups) => {
      groups.forEach((group) => {
        if (group.id && group.subject) this.rememberName(group.id, group.subject);
      });
    });

    socket.ev.on("messages.upsert", ({ messages }) => {
      for (const msg of messages) {
        if (msg.key.fromMe) continue;
        const jid = msg.key.remoteJid;
        if (!jid) continue;
        const body = msg.message?.conversation ?? msg.message?.extendedTextMessage?.text ?? null;
        if (!body) continue;
        const phoneNumber = jid.split("@")[0] ?? jid;
        const isGroup = jid.endsWith("@g.us");
        if (!isGroup && msg.pushName) this.rememberName(jid, msg.pushName);
        this.messageHandlers.forEach((handler) =>
          handler({
            jid,
            phoneNumber,
            displayName: this.knownNames.get(jid) ?? (!isGroup ? msg.pushName?.trim() || null : null),
            body,
            senderJid: msg.key.participant ?? jid,
          }),
        );
      }
    });
  }

  private rememberName(jid: string, value: string): void {
    const displayName = value.trim();
    if (!displayName || this.knownNames.get(jid) === displayName) return;
    this.knownNames.set(jid, displayName);
    this.nameHandlers.forEach((handler) => handler({ jid, displayName }));
  }

  private emitStatus(): void {
    this.statusHandlers.forEach((handler) => handler(this.status, this.qr, this.phoneNumber));
  }

  getStatus(): ConnectionStatus {
    return this.status;
  }

  getPhoneNumber(): string | null {
    return this.phoneNumber;
  }

  getQrCode(): string | null {
    return this.qr;
  }

  onStatusChange(handler: StatusHandler): void {
    this.statusHandlers.push(handler);
  }

  onMessage(handler: MessageHandler): void {
    this.messageHandlers.push(handler);
  }

  onNameChange(handler: NameHandler): void {
    this.nameHandlers.push(handler);
    this.knownNames.forEach((displayName, jid) => handler({ jid, displayName }));
  }

  async sendMessage(jid: string, text: string): Promise<void> {
    if (!this.socket) throw new Error("WhatsApp connection not initialized");
    await this.socket.sendMessage(jid, { text });
  }

  async createGroup(name: string, participantPhoneNumbers: string[]): Promise<CreatedGroup> {
    if (!this.socket || this.status !== "connected") {
      throw new Error("WhatsApp is not connected");
    }

    // A provider response can be lost after WhatsApp creates the group. Before
    // every attempt, reconcile by the app-reserved unique group name so a retry
    // links the existing group instead of creating an external duplicate.
    const participating = await this.socket.groupFetchAllParticipating();
    const existing = Object.values(participating).find((group) => group.subject === name);
    if (existing) {
      this.rememberName(existing.id, existing.subject);
      return { jid: existing.id, name: existing.subject, reusedExisting: true };
    }

    const jids = participantPhoneNumbers.map((number) => `${number}@s.whatsapp.net`);
    const registrations = await this.socket.onWhatsApp(...jids);
    if (registrations) {
      const registered = new Set(
        registrations.filter((item) => Boolean(item.exists)).map((item) => item.jid),
      );
      const missing = participantPhoneNumbers.filter(
        (number) => !registered.has(`${number}@s.whatsapp.net`),
      );
      if (missing.length > 0) {
        throw new Error(`Not registered on WhatsApp: ${missing.map((number) => `+${number}`).join(", ")}`);
      }
    }

    const group = await this.socket.groupCreate(name, jids);
    this.rememberName(group.id, group.subject);
    return { jid: group.id, name: group.subject, reusedExisting: false };
  }
}
