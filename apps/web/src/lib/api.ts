import type {
  Client,
  CreateClientInput,
  UpdateClientInput,
  CreateTravellerInput,
  CreateUserInput,
  EmployeeDetail,
  EmployeeSummary,
  LoginResponse,
  StaffRole,
  Traveller,
  UpdateEmployeeInput,
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
      if (typeof window !== "undefined" && window.location.pathname !== "/login") {
        const redirect = `${window.location.pathname}${window.location.search}`;
        window.location.replace(`/login?redirect=${encodeURIComponent(redirect)}`);
      }
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
  clientId: number | null;
  clientName: string | null;
};

export type MessageRecord = {
  id: number;
  conversationId: number;
  direction: "inbound" | "outbound";
  body: string;
  senderJid: string;
  providerMessageId: string | null;
  deliveryStatus: "pending" | "sending" | "sent" | "received" | "failed" | "delivery_unknown";
  deliveryAttemptCount: number;
  lastDeliveryError: string | null;
  createdAt: string;
};

export type DraftIntakeStatus = "pending" | "rejected" | "approved" | "failed";
export type DraftIntakeRecord = {
  id: number;
  conversationId: number;
  sourceMessageId: number;
  status: DraftIntakeStatus;
  requestTypeId: number | null;
  requestTypeCode: string | null;
  requestTypeName: string | null;
  urgencyLevelId: number | null;
  urgencyCode: string | null;
  urgencyName: string | null;
  summary: string;
  passengerCount: number | null;
  origin: string | null;
  destination: string | null;
  departureDateText: string | null;
  returnDateText: string | null;
  missingInformation: string[];
  suggestedReply: string | null;
  confidence: number | null;
  analysisError: string | null;
  travelRequestId: number | null;
  travelRequestNumber: string | null;
  reviewedByName: string | null;
  createdAt: string;
  updatedAt: string;
};

export type UpdateDraftIntakeInput = {
  requestTypeId: number;
  urgencyLevelId: number;
  summary: string;
  passengerCount: number | null;
  origin: string | null;
  destination: string | null;
  departureDateText: string | null;
  returnDateText: string | null;
  missingInformation: string[];
  suggestedReply: string | null;
};

export type TravelRequestRecord = {
  id: number;
  requestNumber: string;
  clientId: number;
  clientName: string;
  tripSummary: string;
  requestTypeId: number;
  requestTypeCode: string;
  requestTypeName: string;
  requestStatusId: number;
  requestStatusCode: string;
  requestStatusName: string;
  urgencyLevelId: number;
  urgencyCode: string;
  urgencyName: string;
  responseDueAt: string | null;
  serviceDueAt: string | null;
  assignedUserId: number | null;
  assignedUserName: string | null;
  assignedAt: string | null;
  assignedByUserId: number | null;
  assignedByUserName: string | null;
  assignmentStatus: "unassigned" | "recommended" | "assigned" | "reassignment_needed" | "escalated";
  sourceConversationId: number | null;
  proposedReply: string | null;
  clientWhatsAppNumber: string | null;
  createdAt: string;
};

export type AssignmentCandidate = {
  userId: number;
  name: string;
  routingLevel: "preferred" | "secondary" | "continuity" | "team" | "escalation" | "manual";
  eligible: boolean;
  reasons: string[];
  openRequestCount: number;
  capacityLimit: number;
};

export type AssignmentRecommendation = {
  requestId: number;
  assignmentMode: "recommend_only" | "automatic";
  recommendedUserId: number | null;
  recommendedUserName: string | null;
  routingLevel: AssignmentCandidate["routingLevel"];
  explanation: string;
  confirmationRequired: boolean;
  nextFallbackAt: string | null;
  candidates: AssignmentCandidate[];
};

export type AssignmentHistoryEvent = {
  id: number;
  eventType: "assigned" | "reassigned" | "automatic_assigned" | "override" | "escalated";
  routingLevel: AssignmentCandidate["routingLevel"];
  staffUserId: number | null;
  staffUserName: string | null;
  actorUserId: number | null;
  actorUserName: string | null;
  explanation: string;
  createdAt: string;
};

export type AssignmentUrgencyPolicy = {
  urgencyLevelId: number;
  urgencyCode: string;
  urgencyName: string;
  preferredWaitMinutes: number;
  secondaryWaitMinutes: number;
  escalationWaitMinutes: number;
};

export type StaffRoutingProfile = {
  userId: number;
  name: string;
  roles: string[];
  active: boolean;
  availabilityStatus: "available" | "unavailable" | "absent";
  capacityLimit: number;
  highPriorityCapacityLimit: number;
  timezone: string;
  workdays: number[];
  workdayStart: string;
  workdayEnd: string;
  eligibleRequestTypeIds: number[];
  openRequestCount: number;
};

export type AssignmentSettings = {
  assignmentMode: "recommend_only" | "automatic";
  teamStrategy: "lowest_workload" | "round_robin";
  eligibleRoles: string[];
  escalationRoles: string[];
  continuityEnabled: boolean;
  workingHoursEnabled: boolean;
  urgencyPolicies: AssignmentUrgencyPolicy[];
  staffProfiles: StaffRoutingProfile[];
};

export type AssignableStaffRecord = {
  id: number;
  name: string;
  roles: StaffRole[];
};

export type StaffNotificationRecord = {
  id: number;
  type: "request_assigned";
  title: string;
  message: string;
  entityType: "travel_request";
  entityId: string;
  createdByName: string | null;
  readAt: string | null;
  createdAt: string;
};

export type StaffNotificationsResponse = {
  unreadCount: number;
  notifications: StaffNotificationRecord[];
};

export type ClientTraveller = {
  id: number;
  name: string;
  dob: string | null;
  passportStatus: string;
  relationship: string | null;
  isDemo: boolean;
};

export type SystemSettings = {
  demoDataEnabled: boolean;
  updatedAt: string;
};

export type WhatsAppGroupOptions = {
  clients: Array<{ id: number; name: string }>;
  requests: Array<{ id: number; requestNumber: string; clientId: number; tripSummary: string }>;
  travellers: Array<{ id: number; name: string; clientIds: number[] }>;
  staff: Array<{ id: number; name: string; roles: string[]; phoneNumber: string | null }>;
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

export type MessageTemplate = {
  id: number;
  code: string;
  name: string;
  purpose: string;
  languageCode: string;
  languageName: string;
  messageBody: string;
  active: boolean;
  isStarter: boolean;
  createdAt: string;
  updatedAt: string;
};

export type MessageTemplateInput = Omit<
  MessageTemplate,
  "id" | "isStarter" | "createdAt" | "updatedAt"
>;

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

export type RequestSetting = {
  id: number;
  code: string;
  name: string;
  description: string;
  position: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};
export type RequestSettingInput = Omit<RequestSetting, "id" | "createdAt" | "updatedAt">;
export type UrgencyLevel = RequestSetting & {
  responseDeadlineMinutes: number | null;
  serviceDeadlineMinutes: number | null;
};
export type UrgencyLevelInput = Omit<UrgencyLevel, "id" | "createdAt" | "updatedAt">;
export type RequestWorkflowSettings = {
  requestTypes: RequestSetting[];
  requestStatuses: RequestSetting[];
  urgencyLevels: UrgencyLevel[];
};

export type OpenAiModel = "gpt-5.6-luna" | "gpt-5.6-terra" | "gpt-5.6-sol";
export type AiReasoningEffort = "none" | "low" | "medium";
export type AiProviderSettings = {
  provider: "openai";
  configured: boolean;
  apiKeyLastFour: string | null;
  model: OpenAiModel;
  reasoningEffort: AiReasoningEffort;
  maxOutputTokens: number;
  enabled: boolean;
  humanReviewRequired: true;
  redactSensitiveData: true;
  connectionStatus: "connected" | "not_tested" | "failed";
  lastTestedAt: string | null;
  updatedAt: string | null;
  encryptionReady: boolean;
};
export type AiProviderInput = {
  apiKey?: string;
  model: OpenAiModel;
  reasoningEffort: AiReasoningEffort;
  maxOutputTokens: number;
  enabled: boolean;
};
export type AiConnectionTest = {
  ok: true;
  model: OpenAiModel;
  message: string;
  testedAt: string;
};
export type AiUsageEvent = {
  id: string;
  operation: "connection_test" | "generation";
  purpose: string;
  model: string;
  status: "succeeded" | "failed";
  providerResponseId: string | null;
  initiatedByName: string | null;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUsd: string;
  durationMs: number | null;
  errorCode: string | null;
  createdAt: string;
};
export type AiUsageReport = {
  periodDays: number | null;
  summary: {
    requestCount: number;
    successfulCount: number;
    failedCount: number;
    inputTokens: number;
    cachedInputTokens: number;
    outputTokens: number;
    totalTokens: number;
    estimatedCostUsd: string;
  };
  events: AiUsageEvent[];
  pricingNote: string;
};

export const authApi = {
  login: (email: string, password: string) =>
    request<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
};

export const usersApi = {
  list: () => request<EmployeeSummary[]>("/users"),
  get: (id: number) => request<EmployeeDetail>(`/users/${id}`),
  create: (input: CreateUserInput) =>
    request<EmployeeDetail>("/users", { method: "POST", body: JSON.stringify(input) }),
  update: (id: number, input: UpdateEmployeeInput) =>
    request<EmployeeDetail>(`/users/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
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

export const messageTemplatesApi = {
  listActive: () => request<MessageTemplate[]>("/message-templates"),
  listAll: () => request<MessageTemplate[]>("/message-templates/admin"),
  create: (input: MessageTemplateInput) =>
    request<MessageTemplate>("/message-templates", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  update: (id: number, input: MessageTemplateInput) =>
    request<MessageTemplate>(`/message-templates/${id}`, {
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

export const requestWorkflowSettingsApi = {
  listActive: () => request<RequestWorkflowSettings>("/request-workflow-settings"),
  listAll: () => request<RequestWorkflowSettings>("/request-workflow-settings/admin"),
  createType: (input: RequestSettingInput) => request<RequestSetting>("/request-workflow-settings/types", { method: "POST", body: JSON.stringify(input) }),
  updateType: (id: number, input: RequestSettingInput) => request<RequestSetting>(`/request-workflow-settings/types/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
  createStatus: (input: RequestSettingInput) => request<RequestSetting>("/request-workflow-settings/statuses", { method: "POST", body: JSON.stringify(input) }),
  updateStatus: (id: number, input: RequestSettingInput) => request<RequestSetting>(`/request-workflow-settings/statuses/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
  createUrgency: (input: UrgencyLevelInput) => request<UrgencyLevel>("/request-workflow-settings/urgency-levels", { method: "POST", body: JSON.stringify(input) }),
  updateUrgency: (id: number, input: UrgencyLevelInput) => request<UrgencyLevel>(`/request-workflow-settings/urgency-levels/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
};

export const aiProviderSettingsApi = {
  get: () => request<AiProviderSettings>("/ai-provider-settings"),
  test: (input: { apiKey?: string; model: OpenAiModel }) =>
    request<AiConnectionTest>("/ai-provider-settings/test", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  save: (input: AiProviderInput) =>
    request<AiProviderSettings>("/ai-provider-settings", {
      method: "PUT",
      body: JSON.stringify(input),
    }),
  usage: (days: number | "all") =>
    request<AiUsageReport>(`/ai-provider-settings/usage?days=${days}`),
};

export const systemSettingsApi = {
  get: () => request<SystemSettings>("/system-settings"),
  updateDemoData: (demoDataEnabled: boolean) =>
    request<SystemSettings>("/system-settings/demo-data", {
      method: "PATCH",
      body: JSON.stringify({ demoDataEnabled }),
    }),
};

export const clientsApi = {
  list: () => request<Client[]>("/clients"),
  listReps: () => request<{ id: number; name: string }[]>("/clients/reps"),
  listTravellers: (clientId: number) =>
    request<ClientTraveller[]>(`/clients/${clientId}/travellers`),
  linkTraveller: (
    clientId: number,
    input: { travellerId: number; relationship: string | null },
  ) =>
    request<{ ok: boolean }>(`/clients/${clientId}/travellers`, {
      method: "POST",
      body: JSON.stringify(input),
    }),
  create: (input: CreateClientInput) =>
    request<Client>("/clients", { method: "POST", body: JSON.stringify(input) }),
  update: (id: number, input: UpdateClientInput) =>
    request<Client>(`/clients/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
};

export const travellersApi = {
  list: () => request<Traveller[]>("/travellers"),
  getById: (id: number) => request<Traveller>(`/travellers/${id}`),
  create: (input: CreateTravellerInput) =>
    request<Traveller>("/travellers", { method: "POST", body: JSON.stringify(input) }),
};

export const requestsApi = {
  list: () => request<TravelRequestRecord[]>("/requests"),
  listAssignableStaff: () => request<AssignableStaffRecord[]>("/requests/assignable-staff"),
  getById: (id: number) => request<TravelRequestRecord>(`/requests/${id}`),
  getAssignmentRecommendation: (id: number) =>
    request<AssignmentRecommendation>(`/requests/${id}/assignment-recommendation`),
  getAssignmentHistory: (id: number) =>
    request<AssignmentHistoryEvent[]>(`/requests/${id}/assignment-history`),
  assign: (id: number, assignedUserId: number) =>
    request<TravelRequestRecord>(`/requests/${id}/assignment`, {
      method: "POST",
      body: JSON.stringify({ assignedUserId }),
    }),
  create: (input: { clientId: number; tripSummary: string; requestTypeId?: number }) =>
    request<TravelRequestRecord>("/requests", {
      method: "POST",
      body: JSON.stringify(input),
    }),
};

export const notificationsApi = {
  list: () => request<StaffNotificationsResponse>("/notifications"),
  markRead: (id: number) =>
    request<StaffNotificationRecord>(`/notifications/${id}/read`, { method: "POST" }),
  markAllRead: () =>
    request<{ updatedCount: number }>("/notifications/read-all", { method: "POST" }),
};

export const assignmentSettingsApi = {
  get: () => request<AssignmentSettings>("/assignment-settings"),
  update: (input: AssignmentSettings) => request<AssignmentSettings>("/assignment-settings", {
    method: "PUT",
    body: JSON.stringify(input),
  }),
};

export const messagingApi = {
  getStatus: () => request<MessagingStatus>("/messaging/status"),
  reconnect: () => request<MessagingStatus>("/messaging/reconnect", { method: "POST" }),
  listConversations: () => request<ConversationSummary[]>("/messaging/conversations"),
  startConversation: (phoneNumber: string) =>
    request<{ id: number }>("/messaging/conversations", {
      method: "POST",
      body: JSON.stringify({ phoneNumber }),
    }),
  listMessages: (conversationId: number) =>
    request<MessageRecord[]>(`/messaging/conversations/${conversationId}/messages`),
  listDeliveryFailures: () => request<MessageRecord[]>("/messaging/delivery-failures"),
  retryFailedMessage: (messageId: number) =>
    request<{ ok: boolean }>(`/messaging/messages/${messageId}/retry`, { method: "POST" }),
  listDraftIntakes: (conversationId: number) =>
    request<DraftIntakeRecord[]>(`/messaging/conversations/${conversationId}/draft-intakes`),
  analyzeLatestDraft: (conversationId: number) =>
    request<DraftIntakeRecord | null>(`/messaging/conversations/${conversationId}/draft-intakes/analyze-latest`, {
      method: "POST",
    }),
  updateDraftIntake: (id: number, input: UpdateDraftIntakeInput) =>
    request<DraftIntakeRecord>(`/messaging/draft-intakes/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  rejectDraftIntake: (id: number) =>
    request<DraftIntakeRecord>(`/messaging/draft-intakes/${id}/reject`, { method: "POST" }),
  createRequestFromDraft: (id: number) =>
    request<DraftIntakeRecord>(`/messaging/draft-intakes/${id}/create-request`, { method: "POST" }),
  sendMessage: (conversationId: number, text: string, travelRequestId?: number) =>
    request<{ ok: boolean }>(`/messaging/conversations/${conversationId}/messages`, {
      method: "POST",
      body: JSON.stringify({ text, travelRequestId }),
    }),
  getGroupOptions: () => request<WhatsAppGroupOptions>("/messaging/groups/options"),
  listGroups: () => request<WhatsAppGroupRecord[]>("/messaging/groups"),
  createGroup: (input: CreateWhatsAppGroupInput) =>
    request<WhatsAppGroupRecord>("/messaging/groups", {
      method: "POST",
      body: JSON.stringify(input),
    }),
};
