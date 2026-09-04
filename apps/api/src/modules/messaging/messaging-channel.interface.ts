export type ConnectionStatus = "qr_pending" | "connected" | "disconnected";

export type InboundMessage = {
  accountId: number;
  providerMessageId: string;
  jid: string;
  phoneNumber: string;
  displayName: string | null;
  body: string;
  senderJid: string;
  messageType: "text" | "audio";
  audio: {
    data: Buffer;
    mimeType: string;
    sizeBytes: number;
    sha256: string;
    durationSeconds: number | null;
  } | null;
};

export type VoiceNotePayload = {
  data: Buffer;
  mimeType: string;
  durationSeconds: number | null;
};

export type ConversationName = {
  accountId: number;
  jid: string;
  displayName: string;
};

export type CreatedGroup = {
  jid: string;
  name: string;
  reusedExisting: boolean;
};

export type ResolvedDirectRecipient = {
  jid: string;
  phoneNumber: string;
  displayName: string | null;
};

export type StatusHandler = (
  accountId: number,
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
  initializeAccount(account: { id: number; authKey: string }): Promise<void>;
  getStatus(accountId: number): ConnectionStatus;
  getPhoneNumber(accountId: number): string | null;
  getQrCode(accountId: number): string | null;
  reconnect(accountId: number): Promise<void>;
  disconnect(accountId: number): Promise<void>;
  onStatusChange(handler: StatusHandler): void;
  onMessage(handler: MessageHandler): void;
  onNameChange(handler: NameHandler): void;
  resolveDirectRecipient(accountId: number, phoneNumber: string): Promise<ResolvedDirectRecipient | null>;
  sendMessage(accountId: number, jid: string, text: string): Promise<{ providerMessageId: string }>;
  sendVoiceNote(accountId: number, jid: string, voiceNote: VoiceNotePayload): Promise<{ providerMessageId: string }>;
  createGroup(accountId: number, name: string, participantPhoneNumbers: string[]): Promise<CreatedGroup>;
}

export const MESSAGING_CHANNEL = "MESSAGING_CHANNEL";
