import * as path from "path";
import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import type { WASocket } from "@whiskeysockets/baileys";
import pino from "pino";
import qrcodeTerminal from "qrcode-terminal";
import type {
  ConnectionStatus,
  MessageHandler,
  MessagingChannel,
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
          this.logger.warn("WhatsApp logged out — delete .baileys-auth and re-scan to reconnect.");
        }
      }
    });

    socket.ev.on("messages.upsert", ({ messages }) => {
      for (const msg of messages) {
        if (msg.key.fromMe) continue;
        const jid = msg.key.remoteJid;
        if (!jid) continue;
        const body = msg.message?.conversation ?? msg.message?.extendedTextMessage?.text ?? null;
        if (!body) continue;
        const phoneNumber = jid.split("@")[0] ?? jid;
        this.messageHandlers.forEach((handler) =>
          handler({ jid, phoneNumber, body, senderJid: jid }),
        );
      }
    });
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

  async sendMessage(jid: string, text: string): Promise<void> {
    if (!this.socket) throw new Error("WhatsApp connection not initialized");
    await this.socket.sendMessage(jid, { text });
  }
}
