const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    throw new Error(`Request to ${path} failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export type ConnectionStatus = "qr_pending" | "connected" | "disconnected";

export type MessagingStatus = {
  status: ConnectionStatus;
  qr: string | null;
  phoneNumber: string | null;
};

export type ConversationSummary = {
  id: number;
  whatsappJid: string;
  phoneNumber: string;
  lastMessageAt: string | null;
  lastMessageBody: string | null;
};

export type MessageRecord = {
  id: number;
  conversationId: number;
  direction: "inbound" | "outbound";
  body: string;
  senderJid: string;
  createdAt: string;
};

export const messagingApi = {
  getStatus: () => request<MessagingStatus>("/messaging/status"),
  listConversations: () => request<ConversationSummary[]>("/messaging/conversations"),
  listMessages: (conversationId: number) =>
    request<MessageRecord[]>(`/messaging/conversations/${conversationId}/messages`),
  sendMessage: (conversationId: number, text: string) =>
    request<{ ok: boolean }>(`/messaging/conversations/${conversationId}/messages`, {
      method: "POST",
      body: JSON.stringify({ text }),
    }),
};
