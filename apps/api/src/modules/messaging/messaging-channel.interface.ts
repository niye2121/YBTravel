export type ConnectionStatus = "qr_pending" | "connected" | "disconnected";

export type InboundMessage = {
  jid: string;
  phoneNumber: string;
  displayName: string | null;
  body: string;
  senderJid: string;
};

export type ConversationName = {
  jid: string;
  displayName: string;
};

export type CreatedGroup = {
  jid: string;
  name: string;
  reusedExisting: boolean;
};

export type StatusHandler = (
  status: ConnectionStatus,
  qr: string | null,
  phoneNumber: string | null,
) => void;

export type MessageHandler = (message: InboundMessage) => void;
export type NameHandler = (name: ConversationName) => void;

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
  onNameChange(handler: NameHandler): void;
  sendMessage(jid: string, text: string): Promise<void>;
  createGroup(name: string, participantPhoneNumbers: string[]): Promise<CreatedGroup>;
}

export const MESSAGING_CHANNEL = "MESSAGING_CHANNEL";
