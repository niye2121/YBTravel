import type {
  Client,
  CreateClientInput,
  CreateTravellerInput,
  CreateUserInput,
  LoginResponse,
  Traveller,
  User,
} from "@yb-travel/shared";
import { clearSession, getToken } from "./session";
import { disconnectSocket } from "./socket";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

/**
 * Extracts a readable message from the API's error response shape —
 * either a plain `message` string (most NestJS exceptions) or the
 * zod `fieldErrors` object our own validation errors send — so forms can
 * show something better than "Request failed: 400".
 */
async function extractErrorMessage(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (typeof body.message === "string") return body.message;
    if (body.message && typeof body.message === "object") {
      const first = Object.values(body.message).flat()[0];
      if (typeof first === "string") return first;
    }
  } catch {
    // fall through to the generic message below
  }
  return `Request failed with status ${res.status}`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
  if (!res.ok) {
    // A stale/expired token isn't recoverable — clear it so the next
    // navigation's route guard sends the user back to /login.
    if (res.status === 401) {
      disconnectSocket();
      clearSession();
    }
    throw new Error(await extractErrorMessage(res));
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

export const authApi = {
  login: (email: string, password: string) =>
    request<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
};

export const usersApi = {
  list: () => request<User[]>("/users"),
  create: (input: CreateUserInput) =>
    request<User>("/users", { method: "POST", body: JSON.stringify(input) }),
};

export const clientsApi = {
  list: () => request<Client[]>("/clients"),
  listReps: () => request<{ id: number; name: string }[]>("/clients/reps"),
  create: (input: CreateClientInput) =>
    request<Client>("/clients", { method: "POST", body: JSON.stringify(input) }),
};

export const travellersApi = {
  list: () => request<Traveller[]>("/travellers"),
  create: (input: CreateTravellerInput) =>
    request<Traveller>("/travellers", { method: "POST", body: JSON.stringify(input) }),
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
