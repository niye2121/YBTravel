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
  displayName: string | null;
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

export type TravelRequestRecord = {
  id: number;
  requestNumber: string;
  clientId: number;
  clientName: string;
  tripSummary: string;
  status: string;
  createdAt: string;
};

export type WhatsAppGroupOptions = {
  clients: Array<{ id: number; name: string }>;
  requests: Array<{ id: number; requestNumber: string; clientId: number; tripSummary: string }>;
  travellers: Array<{ id: number; name: string; clientIds: number[] }>;
  staff: Array<{ id: number; name: string; roles: string[] }>;
};

export type GroupParticipantInput = { id: number; phoneNumber: string };

export type CreateWhatsAppGroupInput = {
  clientId: number;
  travelRequestId: number;
  name: string;
  travellers: GroupParticipantInput[];
  staff: GroupParticipantInput[];
};

export type WhatsAppGroupRecord = {
  id: number;
  clientId: number;
  clientName: string;
  travelRequestId: number;
  requestNumber: string;
  tripSummary: string;
  conversationId: number | null;
  whatsappGroupId: string | null;
  name: string;
  status: "creating" | "active" | "failed";
  failureReason: string | null;
  createdByName: string;
  createdAt: string;
  participants: Array<{
    type: "traveller" | "staff";
    entityId: number;
    displayName: string;
    phoneNumber: string;
  }>;
};

export type CalculationBasis = "per_passenger" | "per_booking";

export type BookingFeeGroup = {
  id: number;
  name: string;
  code: string;
  /** Decimal money value from PostgreSQL; kept as text to avoid float authority. */
  amount: string;
  currency: string;
  calculationBasis: CalculationBasis;
  chargeAdults: boolean;
  chargeChildren: boolean;
  chargeInfants: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type BookingFeeGroupInput = Omit<BookingFeeGroup, "id" | "createdAt" | "updatedAt">;

export type TaskPriority = "low" | "normal" | "high" | "urgent";
export type SetupRole =
  | "offshore_intake_employee"
  | "travel_agent"
  | "system_administrator";
export type RequirementEntity = "client" | "traveller" | "request";

export type OnboardingStageSetting = {
  id: number;
  code: string;
  name: string;
  description: string;
  position: number;
  active: boolean;
  completionStage: boolean;
  blocksCompletionUntilReviewed: boolean;
  generatesTask: boolean;
  responsibleRole: SetupRole | null;
  taskPriority: TaskPriority;
  expectedDurationMinutes: number | null;
  createdAt: string;
  updatedAt: string;
};

export type OnboardingStageInput = Omit<OnboardingStageSetting, "id" | "createdAt" | "updatedAt">;

export type RequiredInformationField = {
  id: number;
  entityType: RequirementEntity;
  fieldKey: string;
  label: string;
  required: boolean;
  requiresReview: boolean;
  position: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type RequiredInformationFieldInput = Omit<
  RequiredInformationField,
  "id" | "createdAt" | "updatedAt"
>;

export type WorkflowSettings = {
  stages: OnboardingStageSetting[];
  requiredFields: RequiredInformationField[];
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

export const bookingFeesApi = {
  listActive: () => request<BookingFeeGroup[]>("/booking-fees"),
  listAll: () => request<BookingFeeGroup[]>("/booking-fees/admin"),
  create: (input: BookingFeeGroupInput) =>
    request<BookingFeeGroup>("/booking-fees", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  update: (id: number, input: BookingFeeGroupInput) =>
    request<BookingFeeGroup>(`/booking-fees/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
};

export const workflowSettingsApi = {
  listActive: () => request<WorkflowSettings>("/workflow-settings"),
  listAll: () => request<WorkflowSettings>("/workflow-settings/admin"),
  createStage: (input: OnboardingStageInput) =>
    request<OnboardingStageSetting>("/workflow-settings/stages", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  updateStage: (id: number, input: OnboardingStageInput) =>
    request<OnboardingStageSetting>(`/workflow-settings/stages/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  createRequiredField: (input: RequiredInformationFieldInput) =>
    request<RequiredInformationField>("/workflow-settings/required-fields", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  updateRequiredField: (id: number, input: RequiredInformationFieldInput) =>
    request<RequiredInformationField>(`/workflow-settings/required-fields/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
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

export const requestsApi = {
  list: () => request<TravelRequestRecord[]>("/requests"),
  create: (input: { clientId: number; tripSummary: string }) =>
    request<TravelRequestRecord>("/requests", {
      method: "POST",
      body: JSON.stringify(input),
    }),
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
  getGroupOptions: () => request<WhatsAppGroupOptions>("/messaging/groups/options"),
  listGroups: () => request<WhatsAppGroupRecord[]>("/messaging/groups"),
  createGroup: (input: CreateWhatsAppGroupInput) =>
    request<WhatsAppGroupRecord>("/messaging/groups", {
      method: "POST",
      body: JSON.stringify(input),
    }),
};
