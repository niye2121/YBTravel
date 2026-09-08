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

function handleUnauthorizedResponse(res: Response): void {
  if (res.status !== 401) return;
  disconnectSocket();
  clearSession();
  if (typeof window !== "undefined" && window.location.pathname !== "/login") {
    const redirect = `${window.location.pathname}${window.location.search}`;
    window.location.replace(`/login?redirect=${encodeURIComponent(redirect)}`);
  }
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
    handleUnauthorizedResponse(res);
    throw new Error(await extractErrorMessage(res));
  }
  return res.json() as Promise<T>;
}

async function requestFormData<T>(path: string, formData: FormData): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  if (!res.ok) {
    handleUnauthorizedResponse(res);
    throw new Error(await extractErrorMessage(res));
  }
  return res.json() as Promise<T>;
}

async function requestBlob(path: string): Promise<Blob> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    handleUnauthorizedResponse(res);
    throw new Error(await extractErrorMessage(res));
  }
  return res.blob();
}

export type ConnectionStatus = "qr_pending" | "connected" | "disconnected";

export type MessagingStatus = {
  id: number;
  label: string;
  status: ConnectionStatus;
  qr: string | null;
  phoneNumber: string | null;
  isPrimary: boolean;
  createdAt: string;
  lastConnectedAt: string | null;
};

export type ConversationSummary = {
  id: number;
  accountId: number;
  accountLabel: string;
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
  messageType: "text" | "audio";
  body: string;
  senderJid: string;
  providerMessageId: string | null;
  deliveryStatus: "pending" | "sending" | "sent" | "received" | "failed" | "delivery_unknown";
  deliveryAttemptCount: number;
  lastDeliveryError: string | null;
  hasAudio: boolean;
  audioMimeType: string | null;
  audioSizeBytes: number | null;
  audioDurationSeconds: number | null;
  createdAt: string;
};

export type DraftIntakeStatus = "pending" | "rejected" | "approved" | "failed";
export type BookingResolution = "matched" | "new_booking" | "ambiguous";
export type OpenBookingCandidate = {
  id: number;
  requestNumber: string;
  summary: string;
  origin: string | null;
  destination: string | null;
  departureDateText: string | null;
  returnDateText: string | null;
  statusName: string;
};
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
  bookingResolution: BookingResolution | null;
  matchedTravelRequestId: number | null;
  bookingMatchConfidence: number | null;
  bookingMatchReason: string | null;
  resolvedDepartureDate: string | null;
  departureDatePrecision: "day" | "month" | null;
  resolvedReturnDate: string | null;
  returnDatePrecision: "day" | "month" | null;
  dateInferenceNote: string | null;
  openBookings: OpenBookingCandidate[];
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
  bookingResolution: BookingResolution;
  matchedTravelRequestId: number | null;
};

export type TravelRequestRecord = {
  id: number;
  requestNumber: string;
  clientId: number;
  clientName: string;
  tripSummary: string;
  passengerCount: number | null;
  origin: string | null;
  destination: string | null;
  departureDateText: string | null;
  returnDateText: string | null;
  cabinClass: string | null;
  flexibility: string | null;
  specialRequests: string | null;
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

export type InformationChecklistItem = {
  requirementFieldId: number;
  entityType: "client" | "traveller" | "request";
  entityId: number;
  entityLabel: string;
  fieldKey: string;
  label: string;
  required: boolean;
  requiresReview: boolean;
  present: boolean;
  reviewed: boolean;
  satisfied: boolean;
  valueSummary: string | null;
  reviewedByName: string | null;
  reviewedAt: string | null;
};

export type ClientOnboardingStatus = {
  clientId: number;
  currentStageCode: string;
  currentStageName: string;
  completionStageCode: string | null;
  canComplete: boolean;
  missingItems: string[];
  nextAction: string;
  allowedStageCodes: string[];
  checklist: InformationChecklistItem[];
  transitions: Array<{
    id: string;
    fromStageCode: string | null;
    fromStageName: string | null;
    toStageCode: string;
    toStageName: string;
    reason: string | null;
    changedByName: string | null;
    changedAt: string;
  }>;
  tasks: Array<{
    id: string;
    title: string;
    stageName: string;
    responsibleRole: string | null;
    priority: "low" | "normal" | "high" | "urgent";
    dueAt: string | null;
    status: "open" | "completed";
    completedByName: string | null;
    completedAt: string | null;
  }>;
};

export type RequestInformationStatus = {
  requestId: number;
  complete: boolean;
  missingItems: string[];
  nextAction: string;
  checklist: InformationChecklistItem[];
};

export type RequestDetailsInput = Pick<TravelRequestRecord,
  "passengerCount" | "origin" | "destination" | "departureDateText" |
  "returnDateText" | "cabinClass" | "flexibility" | "specialRequests">;

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
  type: "request_assigned" | "reminder_due" | "reminder_overdue" | "reminder_escalated" | "whatsapp_message";
  title: string;
  message: string;
  entityType: "travel_request" | "client" | "onboarding_task" | "reminder" | "conversation";
  entityId: string;
  createdByName: string | null;
  readAt: string | null;
  createdAt: string;
};

export type StaffNotificationsResponse = {
  inboxUnreadCount: number;
  inboxUnreadByConversation: Record<string, number>;
  unreadCount: number;
  notifications: StaffNotificationRecord[];
};

export type ReminderState = "pending" | "due" | "overdue" | "escalated" | "acknowledged" | "resolved";
export type ReminderRecord = {
  id: string;
  type: "unanswered_inquiry" | "missing_information" | "next_action" | "onboarding_task";
  title: string;
  message: string;
  entityType: "travel_request" | "client" | "onboarding_task";
  entityId: string;
  requestId: number | null;
  requestNumber: string | null;
  clientId: number | null;
  clientName: string | null;
  onboardingTaskId: string | null;
  assignedUserId: number;
  assignedUserName: string;
  state: ReminderState;
  dueAt: string;
  escalatesAt: string;
  acknowledgedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ReminderQueueResponse = {
  counts: Record<ReminderState | "active", number>;
  reminders: ReminderRecord[];
};

export type SupervisorWorkload = {
  userId: number;
  agentName: string;
  roles: string[];
  availabilityStatus: string;
  capacityLimit: number;
  openRequests: number;
  openBookings: number;
  dueToday: number;
  overdue: number;
  escalated: number;
  openCases: number;
  oldestUntouchedAt: string | null;
  oldestUntouchedLabel: string;
};

export type SupervisorReviewType = "pricing_override" | "markup_change" | "waiver" | "assignment_override" | "operational_exception";
export type SupervisorReviewOutcome = "approved" | "rejected" | "noted" | "coaching_required";
export type SupervisorReviewItem = {
  id: string;
  requestId: number | null;
  requestNumber: string | null;
  clientName: string | null;
  type: SupervisorReviewType;
  summary: string;
  overriddenRule: string;
  reason: string;
  valueAmount: string | null;
  currency: string | null;
  occurredById: number;
  occurredByName: string;
  occurredAt: string;
  occurredAtLabel: string;
  status: "unreviewed" | "reviewed";
  reviewedByName: string | null;
  reviewedAt: string | null;
  reviewedAtLabel: string | null;
  outcome: SupervisorReviewOutcome | null;
  reviewComment: string | null;
};

export type SupervisorReviewQueue = {
  counts: { unreviewed: number; reviewed: number; all: number };
  items: SupervisorReviewItem[];
};

export type SupervisorReviewSettings = {
  markupAmountThreshold: string;
  markupPercentageThreshold: string;
  currency: string;
  updatedAt: string;
};

export type AuditChange = { field: string; before: string; after: string };
export type AuditHistoryItem = {
  id: string;
  eventKind: "change" | "access";
  actorUserId: number | null;
  actorName: string;
  actorEmail: string | null;
  action: string;
  entityType: string;
  entityId: string;
  occurredAt: string;
  occurredAtLabel: string;
  changes: AuditChange[];
  importance: "important" | "standard";
  reason: string | null;
};
export type AuditHistoryResponse = {
  clients: Array<{ id: number; name: string }>;
  items: AuditHistoryItem[];
  actors: Array<{ id: number; name: string; email: string | null }>;
  actions: string[];
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
};
export type AuditHistoryFilters = {
  clientId: string;
  q: string;
  actorUserId: string;
  action: string;
  dateFrom: string;
  dateTo: string;
  importantOnly: boolean;
  page: number;
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
  testDataDeletionEnabled: boolean;
  updatedAt: string;
};

export type TestDataResetResult = {
  deleted: {
    conversations: number;
    messages: number;
    groups: number;
    requests: number;
    clients: number;
    travellers: number;
    notifications: number;
  };
};

export type WhatsAppGroupOptions = {
  clients: Array<{ id: number; name: string }>;
  requests: Array<{ id: number; requestNumber: string; clientId: number; tripSummary: string }>;
  travellers: Array<{ id: number; name: string; clientIds: number[] }>;
  staff: Array<{ id: number; name: string; roles: string[]; phoneNumber: string | null }>;
};

export type GroupParticipantInput = { id: number; phoneNumber: string };

export type CreateWhatsAppGroupInput = {
  accountId: number;
  clientId: number;
  travelRequestId: number;
  name: string;
  travellers: GroupParticipantInput[];
  staff: GroupParticipantInput[];
};

export type WhatsAppGroupRecord = {
  id: number;
  accountId: number;
  accountLabel: string;
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

export type PassengerCategory = "adult" | "child" | "infant";
export type RequestBookingFee = {
  requestId: number;
  feeGroup: BookingFeeGroup;
  availableTravellers: Array<{ id: number; name: string; dob: string | null }>;
  passengers: Array<{ travellerId: number; name: string; category: PassengerCategory; charged: boolean; feeAmount: string }>;
  chargedUnits: number;
  totalAmount: string;
  currency: string;
  calculatedAt: string | null;
};
export type EntityNote = { id: string; clientId: number; travelRequestId: number | null; body: string; createdByName: string | null; createdAt: string; updatedAt: string };
export type EntityDocument = { id: string; clientId: number; travelRequestId: number | null; fileName: string; mimeType: string; sizeBytes: number; sha256: string; description: string | null; uploadedByName: string | null; createdAt: string };
export type RecordActivity = { id: string; type: "note" | "document" | "message"; title: string; detail: string; actorName: string | null; occurredAt: string; direction?: "inbound" | "outbound" };

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
  getRequestFee: (requestId: number) => request<RequestBookingFee>(`/booking-fees/requests/${requestId}`),
  saveRequestFee: (requestId: number, passengers: Array<{ travellerId: number; category: PassengerCategory }>) =>
    request<RequestBookingFee>(`/booking-fees/requests/${requestId}`, {
      method: "POST", body: JSON.stringify({ passengers }),
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
  render: (id: number, conversationId: number) =>
    request<{ template: MessageTemplate; renderedText: string; missingVariables: string[] }>(`/message-templates/${id}/render`, {
      method: "POST", body: JSON.stringify({ conversationId }),
    }),
};

function recordApi(scope: "clients" | "requests") {
  return {
    listNotes: (id: number) => request<EntityNote[]>(`/${scope}/${id}/records/notes`),
    addNote: (id: number, body: string) => request<EntityNote>(`/${scope}/${id}/records/notes`, { method: "POST", body: JSON.stringify({ body }) }),
    listDocuments: (id: number) => request<EntityDocument[]>(`/${scope}/${id}/records/documents`),
    uploadDocument: (id: number, file: File, description: string) => {
      const form = new FormData(); form.append("document", file); if (description.trim()) form.append("description", description.trim());
      return requestFormData<EntityDocument>(`/${scope}/${id}/records/documents`, form);
    },
    activity: (id: number) => request<RecordActivity[]>(`/${scope}/${id}/records/activity`),
  };
}
export const clientRecordsApi = recordApi("clients");
export const requestRecordsApi = recordApi("requests");
export const recordDocumentsApi = {
  download: (id: string) => requestBlob(`/record-documents/${id}/download`),
  preview: (id: string) => requestBlob(`/record-documents/${id}/preview`),
  delete: (id: string) => request<{ deleted: boolean; id: string }>(`/record-documents/${id}`, { method: "DELETE" }),
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
  updateTestDataDeletion: (testDataDeletionEnabled: boolean) =>
    request<SystemSettings>("/system-settings/test-data-deletion", {
      method: "PATCH",
      body: JSON.stringify({ testDataDeletionEnabled }),
    }),
  resetTestData: (confirmation: "DELETE ALL TEST DATA") =>
    request<TestDataResetResult>("/system-settings/test-data/reset", {
      method: "POST",
      body: JSON.stringify({ confirmation }),
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
  getOnboardingStatus: (id: number) =>
    request<ClientOnboardingStatus>(`/clients/${id}/onboarding-status`),
  reviewInformation: (
    id: number,
    input: { requirementFieldId: number; entityType: "client" | "traveller"; entityId: number },
  ) => request<ClientOnboardingStatus>(`/clients/${id}/information/review`, {
    method: "POST",
    body: JSON.stringify(input),
  }),
  completeOnboardingTask: (clientId: number, taskId: string) =>
    request<ClientOnboardingStatus>(`/clients/${clientId}/onboarding-tasks/${taskId}/complete`, {
      method: "POST",
    }),
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
  getInformationStatus: (id: number) =>
    request<RequestInformationStatus>(`/requests/${id}/information-status`),
  updateDetails: (id: number, input: RequestDetailsInput) =>
    request<TravelRequestRecord>(`/requests/${id}/details`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  reviewInformation: (id: number, requirementFieldId: number) =>
    request<RequestInformationStatus>(`/requests/${id}/information/review`, {
      method: "POST",
      body: JSON.stringify({ requirementFieldId }),
    }),
};

export const notificationsApi = {
  readConversation: (conversationId: number, throughMessageId: number) =>
    request<{ updatedCount: number }>(`/notifications/conversations/${conversationId}/read/${throughMessageId}`, { method: "POST" }),
  list: () => request<StaffNotificationsResponse>("/notifications"),
  markRead: (id: number) =>
    request<StaffNotificationRecord>(`/notifications/${id}/read`, { method: "POST" }),
  markAllRead: () =>
    request<{ updatedCount: number }>("/notifications/read-all", { method: "POST" }),
};

export const remindersApi = {
  list: (state: ReminderState | "active" | "all", scope: "mine" | "all") =>
    request<ReminderQueueResponse>(`/reminders?state=${state}&scope=${scope}`),
  acknowledge: (id: string) =>
    request<ReminderRecord>(`/reminders/${id}/acknowledge`, { method: "POST" }),
  reassign: (id: string, assignedUserId: number) =>
    request<ReminderRecord>(`/reminders/${id}/assignment`, {
      method: "PATCH",
      body: JSON.stringify({ assignedUserId }),
    }),
};

export const supervisorApi = {
  workload: (showAll = false) => request<SupervisorWorkload[]>(`/supervisor/workload?showAll=${showAll}`),
  reviews: (status: "unreviewed" | "reviewed" | "all") =>
    request<SupervisorReviewQueue>(`/supervisor/reviews?status=${status}`),
  recordReview: (input: {
    requestId: number | null; type: SupervisorReviewType; summary: string;
    overriddenRule: string; reason: string; valueAmount: string | null; currency: string | null;
  }) => request<SupervisorReviewItem>("/supervisor/reviews", { method: "POST", body: JSON.stringify(input) }),
  completeReview: (id: string, outcome: SupervisorReviewOutcome, comment: string) =>
    request<SupervisorReviewItem>(`/supervisor/reviews/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ outcome, comment }),
    }),
  settings: () => request<SupervisorReviewSettings>("/supervisor/settings"),
  updateSettings: (input: Omit<SupervisorReviewSettings, "updatedAt">) =>
    request<SupervisorReviewSettings>("/supervisor/settings", { method: "PATCH", body: JSON.stringify(input) }),
};

export const auditHistoryApi = {
  list: (filters: AuditHistoryFilters) => {
    const params = new URLSearchParams();
    if (filters.q) params.set("q", filters.q);
    if (filters.actorUserId) params.set("actorUserId", filters.actorUserId);
    if (filters.clientId) params.set("clientId", filters.clientId);
    if (filters.action) params.set("action", filters.action);
    if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
    if (filters.dateTo) params.set("dateTo", filters.dateTo);
    params.set("importantOnly", String(filters.importantOnly));
    params.set("page", String(filters.page));
    return request<AuditHistoryResponse>(`/audit-history?${params.toString()}`);
  },
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
  listAccounts: () => request<MessagingStatus[]>("/messaging/accounts"),
  createAccount: (label: string) => request<MessagingStatus>("/messaging/accounts", {
    method: "POST",
    body: JSON.stringify({ label }),
  }),
  reconnectAccount: (accountId: number) => request<MessagingStatus>(`/messaging/accounts/${accountId}/reconnect`, { method: "POST" }),
  disconnectAccount: (accountId: number) => request<MessagingStatus>(`/messaging/accounts/${accountId}/disconnect`, { method: "POST" }),
  reconnect: () => request<MessagingStatus>("/messaging/reconnect", { method: "POST" }),
  disconnect: () => request<MessagingStatus>("/messaging/disconnect", { method: "POST" }),
  listConversations: () => request<ConversationSummary[]>("/messaging/conversations"),
  startConversation: (phoneNumber: string, accountId?: number) =>
    request<{ id: number }>("/messaging/conversations", {
      method: "POST",
      body: JSON.stringify({ phoneNumber, accountId }),
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
  applyDraftToBooking: (id: number) =>
    request<DraftIntakeRecord>(`/messaging/draft-intakes/${id}/apply-to-booking`, { method: "POST" }),
  sendMessage: (conversationId: number, text: string, travelRequestId?: number) =>
    request<{ ok: boolean }>(`/messaging/conversations/${conversationId}/messages`, {
      method: "POST",
      body: JSON.stringify({ text, travelRequestId }),
    }),
  sendVoiceNote: (conversationId: number, audio: Blob, durationSeconds: number | null) => {
    const formData = new FormData();
    formData.append("audio", audio, "voice-note");
    if (durationSeconds !== null) formData.append("durationSeconds", String(durationSeconds));
    return requestFormData<{ ok: boolean }>(`/messaging/conversations/${conversationId}/voice-notes`, formData);
  },
  getMessageAudio: (messageId: number) => requestBlob(`/messaging/messages/${messageId}/audio`),
  getGroupOptions: () => request<WhatsAppGroupOptions>("/messaging/groups/options"),
  listGroups: () => request<WhatsAppGroupRecord[]>("/messaging/groups"),
  createGroup: (input: CreateWhatsAppGroupInput) =>
    request<WhatsAppGroupRecord>("/messaging/groups", {
      method: "POST",
      body: JSON.stringify(input),
    }),
};
