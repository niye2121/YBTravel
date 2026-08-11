export type ConnectionStatus = "qr_pending" | "connected" | "disconnected";

export type InboundMessage = {
  jid: string;
  phoneNumber: string;
  body: string;
  senderJid: string;
};

export type StatusHandler = (
  status: ConnectionStatus,
  qr: string | null,
  phoneNumber: string | null,
) => void;

export type MessageHandler = (message: InboundMessage) => void;

/**
 * Domain-defined messaging interface — per CLAUDE.md, every external system
 * sits behind an adapter interface defined by us, not the vendor's SDK.
 * Baileys is one implementation; a future Cloud API migration (see
 * docs/05-open-decisions.md #9) is a second implementation of this same
 * interface, not a rewrite of everything that depends on it.
 */
export interface MessagingChannel {
  getStatus(): ConnectionStatus;
  getPhoneNumber(): string | null;
  getQrCode(): string | null;
  onStatusChange(handler: StatusHandler): void;
  onMessage(handler: MessageHandler): void;
  sendMessage(jid: string, text: string): Promise<void>;
}

export const MESSAGING_CHANNEL = "MESSAGING_CHANNEL";
