import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { Pool, PoolClient } from "pg";
import type { StaffPermission } from "@yb-travel/shared";
import { z } from "zod";
import { recordAudit } from "../../database/audit";
import { PG_POOL } from "../../database/database.module";
import { OpenAiClientService } from "../ai-provider-settings/openai-client.service";
import { RequestsService } from "../requests/requests.service";
import {
  decideBookingResolution,
  resolveClosestFutureDate,
  type BookingResolution,
  type DatePrecision,
} from "./booking-context";
import { MessagingGateway } from "./messaging.gateway";

export type DraftIntakeStatus = "pending" | "rejected" | "approved" | "failed";

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
  departureDatePrecision: DatePrecision | null;
  resolvedReturnDate: string | null;
  returnDatePrecision: DatePrecision | null;
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

type DraftRow = {
  id: number;
  conversation_id: number;
  source_message_id: number;
  status: DraftIntakeStatus;
  request_type_id: number | null;
  request_type_code: string | null;
  request_type_name: string | null;
  urgency_level_id: number | null;
  urgency_code: string | null;
  urgency_name: string | null;
  summary: string;
  passenger_count: number | null;
  origin: string | null;
  destination: string | null;
  departure_date_text: string | null;
  return_date_text: string | null;
  missing_information: unknown;
  suggested_reply: string | null;
  confidence: number | null;
  booking_resolution: BookingResolution | null;
  matched_travel_request_id: number | null;
  booking_match_confidence: number | null;
  booking_match_reason: string | null;
  resolved_departure_date: string | null;
  departure_date_precision: DatePrecision | null;
  resolved_return_date: string | null;
  return_date_precision: DatePrecision | null;
  date_inference_note: string | null;
  analysis_error: string | null;
  travel_request_id: number | null;
  travel_request_number: string | null;
  reviewed_by_name: string | null;
  created_at: string;
  updated_at: string;
};

type CatalogueItem = { id: number; code: string; name: string };

type ConversationContextMessage = {
  direction: "inbound" | "outbound";
  body: string;
};

type ActiveBookingContext = {
  travelRequestId: number;
  requestNumber: string;
};

type BookingCandidateRow = {
  id: number;
  request_number: string;
  trip_summary: string;
  origin: string | null;
  destination: string | null;
  departure_date_text: string | null;
  return_date_text: string | null;
  request_status_name: string;
};

const aiResultSchema = z.object({
  isRequest: z.boolean(),
  requestTypeCode: z.string(),
  urgencyCode: z.string(),
  summary: z.string().trim().max(200),
  passengerCount: z.number().int().min(1).max(100).nullable(),
  origin: z.string().trim().max(100).nullable(),
  destination: z.string().trim().max(100).nullable(),
  departureDateText: z.string().trim().max(100).nullable(),
  returnDateText: z.string().trim().max(100).nullable(),
  missingInformation: z.array(z.string().trim().min(1).max(200)).max(20),
  suggestedReply: z.string().trim().max(2000).nullable(),
  confidence: z.number().int().min(0).max(100),
  bookingIntent: z.enum(["existing_booking", "new_booking", "unclear"]),
  matchedTravelRequestId: z.number().int().positive().nullable(),
  bookingMatchConfidence: z.number().int().min(0).max(100),
  bookingMatchReason: z.string().trim().max(500),
});

const SELECT_DRAFTS = `
  SELECT d.id, d.conversation_id, d.source_message_id, d.status,
         d.request_type_id, rt.code AS request_type_code, rt.name AS request_type_name,
         d.urgency_level_id, ul.code AS urgency_code, ul.name AS urgency_name,
         d.summary, d.passenger_count, d.origin, d.destination,
         d.departure_date_text, d.return_date_text, d.missing_information,
         d.suggested_reply, d.confidence, d.booking_resolution,
         d.matched_travel_request_id, d.booking_match_confidence,
         d.booking_match_reason, d.resolved_departure_date,
         d.departure_date_precision, d.resolved_return_date,
         d.return_date_precision, d.date_inference_note, d.analysis_error,
         d.travel_request_id, tr.request_number AS travel_request_number,
         u.name AS reviewed_by_name, d.created_at, d.updated_at
  FROM ai_draft_intakes d
  LEFT JOIN request_types rt ON rt.id = d.request_type_id
  LEFT JOIN urgency_levels ul ON ul.id = d.urgency_level_id
  LEFT JOIN travel_requests tr ON tr.id = d.travel_request_id
  LEFT JOIN users u ON u.id = d.reviewed_by
`;

function toDraft(row: DraftRow, openBookings: OpenBookingCandidate[] = []): DraftIntakeRecord {
  const missing = Array.isArray(row.missing_information)
    ? row.missing_information.filter((item): item is string => typeof item === "string")
    : [];
  return {
    id: row.id,
    conversationId: row.conversation_id,
    sourceMessageId: row.source_message_id,
    status: row.status,
    requestTypeId: row.request_type_id,
    requestTypeCode: row.request_type_code,
    requestTypeName: row.request_type_name,
    urgencyLevelId: row.urgency_level_id,
    urgencyCode: row.urgency_code,
    urgencyName: row.urgency_name,
    summary: row.summary,
    passengerCount: row.passenger_count,
    origin: row.origin,
    destination: row.destination,
    departureDateText: row.departure_date_text,
    returnDateText: row.return_date_text,
    missingInformation: missing,
    suggestedReply: row.suggested_reply,
    confidence: row.confidence,
    bookingResolution: row.booking_resolution,
    matchedTravelRequestId: row.matched_travel_request_id,
    bookingMatchConfidence: row.booking_match_confidence,
    bookingMatchReason: row.booking_match_reason,
    resolvedDepartureDate: row.resolved_departure_date,
    departureDatePrecision: row.departure_date_precision,
    resolvedReturnDate: row.resolved_return_date,
    returnDatePrecision: row.return_date_precision,
    dateInferenceNote: row.date_inference_note,
    openBookings,
    analysisError: row.analysis_error,
    travelRequestId: row.travel_request_id,
    travelRequestNumber: row.travel_request_number,
    reviewedByName: row.reviewed_by_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function cleanNullable(value: string | null): string | null {
  const next = value?.trim() ?? "";
  return next ? next : null;
}

function redactSensitiveData(value: string): string {
  return value
    .replace(/\b(?:\d[ -]*?){13,19}\b/g, "[PAYMENT CARD REDACTED]")
    .replace(/\b(cvv|cvc|security code)\s*[:#-]?\s*\d{3,4}\b/gi, "$1 [REDACTED]")
    .replace(/\b(passport(?: number| no\.?| #)?)\s*[:#-]?\s*[a-z0-9]{5,20}\b/gi, "$1 [REDACTED]");
}

function isLikelyTravelRequest(value: string): boolean {
  const text = value.trim().toLowerCase();
  if (text.length < 8) return false;
  if (/^(hi|hello|hey|thanks|thank you|ok|okay|good morning|good afternoon)[!. ]*$/i.test(text)) return false;
  return /(flight|travel|trip|book|booking|ticket|change|cancel|refund|airport|passenger|passport|visa|hotel|depart|return|from\s+.+\s+to\s+|\b[a-z]{3}\b.*\b[a-z]{3}\b)/i.test(text);
}

/**
 * Converts an open travel-request row into the booking wording used by the
 * Inbox resolver. It keeps the Phase 1 database model separate from the later
 * Sabre booking/PNR record while giving employees one consistent choice list.
 */
function toOpenBooking(row: BookingCandidateRow): OpenBookingCandidate {
  return {
    id: row.id,
    requestNumber: row.request_number,
    summary: row.trip_summary,
    origin: row.origin,
    destination: row.destination,
    departureDateText: row.departure_date_text,
    returnDateText: row.return_date_text,
    statusName: row.request_status_name,
  };
}

/**
 * Recognizes short answers that may only make sense beside the preceding
 * question. Greetings and generic acknowledgements stay excluded, while yes
 * and no remain valid answers when an open booking supplies the context.
 */
function isPossibleContextualAnswer(value: string): boolean {
  const text = value.trim();
  if (text.length < 2) return false;
  return !/^(hi|hello|hey|thanks|thank you|ok|okay|good morning|good afternoon)[!. ]*$/i.test(text);
}

/**
 * Detects explicit language that starts another trip. Ordinary answers to an
 * employee's follow-up stay attached to the active booking.
 */
function explicitlyStartsAnotherBooking(value: string): boolean {
  return /\b(another|separate|different|additional|new)\s+(?:flight|trip|booking|ticket)|\balso\s+(?:need|want|book)\b/i.test(value);
}

@Injectable()
export class DraftIntakesService {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly openAi: OpenAiClientService,
    private readonly requests: RequestsService,
    private readonly gateway: MessagingGateway,
  ) {}

  async list(conversationId: number): Promise<DraftIntakeRecord[]> {
    const [result, openBookings] = await Promise.all([
      this.pool.query<DraftRow>(
        `${SELECT_DRAFTS} WHERE d.conversation_id = $1 ORDER BY d.created_at DESC, d.id DESC`,
        [conversationId],
      ),
      this.loadOpenBookings(conversationId),
    ]);
    return result.rows.map((row) => toDraft(row, openBookings));
  }

  async analyzeLatest(conversationId: number, actorUserId: number): Promise<DraftIntakeRecord | null> {
    const result = await this.pool.query<{ id: number }>(
      `SELECT id FROM messages
       WHERE conversation_id = $1 AND direction = 'inbound'
       ORDER BY created_at DESC, id DESC LIMIT 1`,
      [conversationId],
    );
    const messageId = result.rows[0]?.id;
    if (!messageId) throw new BadRequestException("This conversation has no incoming message to analyze");
    return this.analyzeInboundMessage(messageId, actorUserId, true);
  }

  async analyzeInboundMessage(
    messageId: number,
    actorUserId?: number,
    force = false,
  ): Promise<DraftIntakeRecord | null> {
    const messageResult = await this.pool.query<{
      conversation_id: number;
      body: string;
      direction: "inbound" | "outbound";
    }>("SELECT conversation_id, body, direction FROM messages WHERE id = $1", [messageId]);
    const message = messageResult.rows[0];
    if (!message || message.direction !== "inbound") return null;

    const existing = await this.getBySourceMessage(messageId);
    if (existing && existing.status !== "failed" && !force) return existing;

    const [openBookings, conversationContext, activeBookingContext] = await Promise.all([
      this.loadOpenBookings(message.conversation_id),
      this.loadConversationContext(message.conversation_id),
      this.loadActiveBookingContext(message.conversation_id, messageId),
    ]);
    const activeOpenBooking = activeBookingContext
      ? openBookings.find((booking) => booking.id === activeBookingContext.travelRequestId) ?? null
      : null;
    const earlierContextHasTravelIntent = conversationContext
      .slice(0, -1)
      .some((item) => isLikelyTravelRequest(item.body));
    if (
      !force &&
      !isLikelyTravelRequest(message.body) &&
      !(isPossibleContextualAnswer(message.body) && (openBookings.length > 0 || earlierContextHasTravelIntent))
    ) return null;

    const [typesResult, urgencyResult] = await Promise.all([
      this.pool.query<CatalogueItem>("SELECT id, code, name FROM request_types WHERE active = true ORDER BY position, id"),
      this.pool.query<CatalogueItem>("SELECT id, code, name FROM urgency_levels WHERE active = true ORDER BY position, id"),
    ]);
    if (!typesResult.rows.length || !urgencyResult.rows.length) {
      throw new BadRequestException("Request workflow needs at least one active type and urgency level");
    }

    const typeCodes = typesResult.rows.map((item) => item.code);
    const urgencyCodes = urgencyResult.rows.map((item) => item.code);
    const conversationId = message.conversation_id;
    try {
      const response = await this.openAi.createTextResponse({
        purpose: "intake_classification",
        input: JSON.stringify({
          currentDate: new Date().toISOString().slice(0, 10),
          latestCustomerMessage: redactSensitiveData(message.body),
          recentConversation: conversationContext.map((item) => ({
            direction: item.direction,
            body: redactSensitiveData(item.body),
          })),
          openBookings,
          activeBookingContext: activeOpenBooking ? {
            id: activeOpenBooking.id,
            requestNumber: activeOpenBooking.requestNumber,
            summary: activeOpenBooking.summary,
          } : null,
        }),
        instructions: [
          "You prepare a draft intake for a human travel employee to review.",
          "Never claim that a booking or request has been created, and never invent missing facts.",
          "Use the full recent conversation, especially the immediately preceding question, to interpret short answers.",
          "A booking can contain one or many passenger tickets. Match information to the booking, not to an individual ticket.",
          "Only match one of the supplied openBookings. Closed or completed bookings are deliberately absent.",
          "If the message clearly describes another trip, set bookingIntent to new_booking.",
          "When activeBookingContext is supplied and the latest customer message answers the immediately preceding employee question, match that active booking unless the customer explicitly starts another trip.",
          "Do not treat follow-up details for an already-created booking as another new booking.",
          "If more than one booking is plausible, set bookingIntent to unclear instead of guessing.",
          "When a date omits its year, interpret it as the closest logical future occurrence from currentDate.",
          "For example, near the end of 2026, January means January 2027, not January 2026 or 2028.",
          `Use one request type code from: ${typeCodes.join(", ")}.`,
          `Use one urgency code from: ${urgencyCodes.join(", ")}.`,
          "Set isRequest false for greetings, acknowledgements, spam, or messages with no travel-service intent.",
          "The suggested reply is only a draft. Ask concise questions for important missing details.",
        ].join("\n"),
        initiatedBy: actorUserId,
        relatedEntityType: "conversation",
        relatedEntityId: conversationId,
        responseFormat: {
          name: "yb_travel_draft_intake",
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              isRequest: { type: "boolean" },
              requestTypeCode: { type: "string", enum: typeCodes },
              urgencyCode: { type: "string", enum: urgencyCodes },
              summary: { type: "string", maxLength: 200 },
              passengerCount: { type: ["integer", "null"], minimum: 1, maximum: 100 },
              origin: { type: ["string", "null"], maxLength: 100 },
              destination: { type: ["string", "null"], maxLength: 100 },
              departureDateText: { type: ["string", "null"], maxLength: 100 },
              returnDateText: { type: ["string", "null"], maxLength: 100 },
              missingInformation: { type: "array", maxItems: 20, items: { type: "string", maxLength: 200 } },
              suggestedReply: { type: ["string", "null"], maxLength: 2000 },
              confidence: { type: "integer", minimum: 0, maximum: 100 },
              bookingIntent: { type: "string", enum: ["existing_booking", "new_booking", "unclear"] },
              matchedTravelRequestId: { type: ["integer", "null"], minimum: 1 },
              bookingMatchConfidence: { type: "integer", minimum: 0, maximum: 100 },
              bookingMatchReason: { type: "string", maxLength: 500 },
            },
            required: [
              "isRequest", "requestTypeCode", "urgencyCode", "summary", "passengerCount",
              "origin", "destination", "departureDateText", "returnDateText",
              "missingInformation", "suggestedReply", "confidence",
              "bookingIntent", "matchedTravelRequestId", "bookingMatchConfidence", "bookingMatchReason",
            ],
          },
        },
      });
      const result = aiResultSchema.parse(JSON.parse(response.text));
      if (!result.isRequest) return null;
      const requestType = typesResult.rows.find((item) => item.code === result.requestTypeCode);
      const urgency = urgencyResult.rows.find((item) => item.code === result.urgencyCode);
      if (!requestType || !urgency) throw new Error("AI returned an inactive workflow value");
      const departure = resolveClosestFutureDate(cleanNullable(result.departureDateText));
      const returning = resolveClosestFutureDate(cleanNullable(result.returnDateText));
      let booking = decideBookingResolution({
        intent: result.bookingIntent,
        matchedTravelRequestId: result.matchedTravelRequestId,
        confidence: result.bookingMatchConfidence,
        reason: result.bookingMatchReason,
      }, openBookings.map((item) => item.id));
      const precedingMessage = conversationContext.at(-2);
      if (
        activeOpenBooking &&
        precedingMessage?.direction === "outbound" &&
        isPossibleContextualAnswer(message.body) &&
        !explicitlyStartsAnotherBooking(message.body)
      ) {
        booking = {
          resolution: "matched",
          matchedTravelRequestId: activeOpenBooking.id,
          confidence: 100,
          reason: `This is a follow-up answer for active booking ${activeOpenBooking.requestNumber}.`,
        };
      }
      const dateInferenceNote = [departure.inferenceNote, returning.inferenceNote].filter(Boolean).join(" ") || null;

      if (existing) {
        await this.pool.query(
          `UPDATE ai_draft_intakes SET status = 'pending', request_type_id = $2,
             urgency_level_id = $3, summary = $4, passenger_count = $5, origin = $6,
             destination = $7, departure_date_text = $8, return_date_text = $9,
             missing_information = $10::jsonb, suggested_reply = $11, confidence = $12,
             provider_response_id = $13, booking_resolution = $14,
             matched_travel_request_id = $15, booking_match_confidence = $16,
             booking_match_reason = $17, resolved_departure_date = $18,
             departure_date_precision = $19, resolved_return_date = $20,
             return_date_precision = $21, date_inference_note = $22,
             analysis_error = NULL, updated_at = now()
           WHERE id = $1`,
          [existing.id, requestType.id, urgency.id, result.summary, result.passengerCount,
           cleanNullable(result.origin), cleanNullable(result.destination), departure.displayText || null,
           returning.displayText || null, JSON.stringify(result.missingInformation),
           cleanNullable(result.suggestedReply), result.confidence, response.responseId,
           booking.resolution, booking.matchedTravelRequestId, booking.confidence, booking.reason,
           departure.isoDate, departure.precision, returning.isoDate, returning.precision, dateInferenceNote],
        );
      } else {
        await this.pool.query(
          `INSERT INTO ai_draft_intakes
             (conversation_id, source_message_id, request_type_id, urgency_level_id,
              summary, passenger_count, origin, destination, departure_date_text,
              return_date_text, missing_information, suggested_reply, confidence, provider_response_id,
              booking_resolution, matched_travel_request_id, booking_match_confidence,
              booking_match_reason, resolved_departure_date, departure_date_precision,
              resolved_return_date, return_date_precision, date_inference_note)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12, $13, $14,
                   $15, $16, $17, $18, $19, $20, $21, $22, $23)
           ON CONFLICT (source_message_id) DO NOTHING`,
          [conversationId, messageId, requestType.id, urgency.id, result.summary,
           result.passengerCount, cleanNullable(result.origin), cleanNullable(result.destination),
           departure.displayText || null, returning.displayText || null,
           JSON.stringify(result.missingInformation), cleanNullable(result.suggestedReply),
           result.confidence, response.responseId, booking.resolution,
           booking.matchedTravelRequestId, booking.confidence, booking.reason,
           departure.isoDate, departure.precision, returning.isoDate,
           returning.precision, dateInferenceNote],
        );
      }
    } catch (error) {
      const safeError = error instanceof Error ? error.message.slice(0, 500) : "AI analysis failed";
      await this.pool.query(
        `INSERT INTO ai_draft_intakes
           (conversation_id, source_message_id, status, summary, analysis_error)
         VALUES ($1, $2, 'failed', 'AI analysis failed', $3)
         ON CONFLICT (source_message_id) DO UPDATE SET
           status = 'failed', analysis_error = EXCLUDED.analysis_error, updated_at = now()`,
        [conversationId, messageId, safeError],
      );
    }

    this.gateway.emitDraftIntakeUpdated(conversationId);
    return this.getBySourceMessage(messageId);
  }

  async update(id: number, input: UpdateDraftIntakeInput, actorUserId: number): Promise<DraftIntakeRecord> {
    return this.mutatePending(id, actorUserId, async (client, before) => {
      await this.assertActiveWorkflow(client, input.requestTypeId, input.urgencyLevelId);
      await this.assertBookingSelection(before.conversationId, input.bookingResolution, input.matchedTravelRequestId);
      const departure = resolveClosestFutureDate(cleanNullable(input.departureDateText));
      const returning = resolveClosestFutureDate(cleanNullable(input.returnDateText));
      const dateInferenceNote = [departure.inferenceNote, returning.inferenceNote].filter(Boolean).join(" ") || null;
      await client.query(
        `UPDATE ai_draft_intakes SET request_type_id = $2, urgency_level_id = $3,
           summary = $4, passenger_count = $5, origin = $6, destination = $7,
           departure_date_text = $8, return_date_text = $9,
           missing_information = $10::jsonb, suggested_reply = $11,
           booking_resolution = $12, matched_travel_request_id = $13,
           booking_match_confidence = 100,
           booking_match_reason = 'Selected by an employee during review.',
           resolved_departure_date = $14, departure_date_precision = $15,
           resolved_return_date = $16, return_date_precision = $17,
           date_inference_note = $18, updated_at = now()
         WHERE id = $1`,
        [id, input.requestTypeId, input.urgencyLevelId, input.summary.trim(), input.passengerCount,
         cleanNullable(input.origin), cleanNullable(input.destination), departure.displayText || null,
         returning.displayText || null, JSON.stringify(input.missingInformation), cleanNullable(input.suggestedReply),
         input.bookingResolution, input.bookingResolution === "matched" ? input.matchedTravelRequestId : null,
         departure.isoDate, departure.precision, returning.isoDate, returning.precision, dateInferenceNote],
      );
      const after = await this.loadOne(client, id);
      await recordAudit(client, actorUserId, "ai_draft_intake.updated", "ai_draft_intake", id, before, after);
      return after;
    });
  }

  async reject(id: number, actorUserId: number): Promise<DraftIntakeRecord> {
    return this.mutatePending(id, actorUserId, async (client, before) => {
      await client.query(
        `UPDATE ai_draft_intakes SET status = 'rejected', reviewed_by = $2,
           reviewed_at = now(), updated_at = now() WHERE id = $1`,
        [id, actorUserId],
      );
      const after = await this.loadOne(client, id);
      await recordAudit(client, actorUserId, "ai_draft_intake.rejected", "ai_draft_intake", id, before, after);
      return after;
    });
  }

  async createRequest(id: number, actorUserId: number): Promise<DraftIntakeRecord> {
    const before = await this.getById(id);
    if (!before) throw new NotFoundException("Draft intake not found");
    if (before.status === "approved") return before;
    if (before.status !== "pending") throw new ConflictException("Only a pending draft can create a request");
    if (!before.requestTypeId || !before.urgencyLevelId || !before.summary.trim()) {
      throw new BadRequestException("Complete the request type, urgency, and summary first");
    }
    if (before.bookingResolution === "matched") {
      throw new BadRequestException("Apply this information to the matched booking instead of creating another booking");
    }
    if (before.bookingResolution === "ambiguous") {
      throw new BadRequestException("Choose which booking this information belongs to, or select Create a separate booking");
    }
    const conversation = await this.pool.query<{ client_id: number | null }>(
      `SELECT COALESCE(c.client_id, wg.client_id) AS client_id
       FROM conversations c
       LEFT JOIN whatsapp_groups wg ON wg.conversation_id = c.id
       WHERE c.id = $1 ORDER BY wg.id DESC NULLS LAST LIMIT 1`,
      [before.conversationId],
    );
    const clientId = conversation.rows[0]?.client_id;
    if (!clientId) throw new BadRequestException("Link this conversation to a client before creating the request");

    let request = await this.pool.query<{ id: number }>(
      "SELECT id FROM travel_requests WHERE source_draft_intake_id = $1",
      [id],
    );
    let requestId = request.rows[0]?.id;
    if (!requestId) {
      const created = await this.requests.create(
        clientId, before.summary.trim(), actorUserId, before.requestTypeId, before.urgencyLevelId, id,
        {
          passengerCount: before.passengerCount,
          origin: before.origin,
          destination: before.destination,
          departureDateText: before.departureDateText,
          returnDateText: before.returnDateText,
          resolvedDepartureDate: before.resolvedDepartureDate,
          departureDatePrecision: before.departureDatePrecision,
          resolvedReturnDate: before.resolvedReturnDate,
          returnDatePrecision: before.returnDatePrecision,
        },
      );
      requestId = created.id;
    }

    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `UPDATE ai_draft_intakes SET status = 'approved', travel_request_id = $2,
           reviewed_by = $3, reviewed_at = now(), updated_at = now() WHERE id = $1`,
        [id, requestId, actorUserId],
      );
      const after = await this.loadOne(client, id);
      await recordAudit(client, actorUserId, "ai_draft_intake.approved", "ai_draft_intake", id, before, after);
      await client.query("COMMIT");
      this.gateway.emitDraftIntakeUpdated(before.conversationId);
      return after;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Applies a reviewed conversational answer to one existing open booking.
   * Only supplied values replace booking fields, so a short follow-up such as
   * "January is fine" cannot erase destinations or passenger details already known.
   */
  async applyToBooking(
    id: number,
    actorUserId: number,
    actorPermissions: readonly StaffPermission[],
  ): Promise<DraftIntakeRecord> {
    return this.mutatePending(id, actorUserId, async (client, before) => {
      if (before.bookingResolution !== "matched" || !before.matchedTravelRequestId) {
        throw new BadRequestException("Select the open booking this information belongs to first");
      }
      await this.assertBookingSelection(before.conversationId, "matched", before.matchedTravelRequestId);
      await this.requests.assertCanManage(before.matchedTravelRequestId, actorUserId, actorPermissions);
      const bookingBefore = await client.query(
        "SELECT * FROM travel_requests WHERE id = $1 FOR UPDATE",
        [before.matchedTravelRequestId],
      );
      if (!bookingBefore.rows[0]) throw new NotFoundException("Booking not found");
      await client.query(
        `UPDATE travel_requests SET
           passenger_count = COALESCE($2, passenger_count),
           origin = COALESCE($3, origin),
           destination = COALESCE($4, destination),
           departure_date_text = COALESCE($5, departure_date_text),
           return_date_text = COALESCE($6, return_date_text),
           resolved_departure_date = COALESCE($7, resolved_departure_date),
           departure_date_precision = COALESCE($8, departure_date_precision),
           resolved_return_date = COALESCE($9, resolved_return_date),
           return_date_precision = COALESCE($10, return_date_precision),
           updated_at = now()
         WHERE id = $1`,
        [before.matchedTravelRequestId, before.passengerCount, before.origin, before.destination,
         before.departureDateText, before.returnDateText, before.resolvedDepartureDate,
         before.departureDatePrecision, before.resolvedReturnDate, before.returnDatePrecision],
      );
      await client.query(
        `UPDATE ai_draft_intakes SET status = 'approved', travel_request_id = $2,
           reviewed_by = $3, reviewed_at = now(), updated_at = now() WHERE id = $1`,
        [id, before.matchedTravelRequestId, actorUserId],
      );
      const bookingAfter = await client.query("SELECT * FROM travel_requests WHERE id = $1", [before.matchedTravelRequestId]);
      await recordAudit(
        client,
        actorUserId,
        "travel_request.conversation_information_applied",
        "travel_request",
        before.matchedTravelRequestId,
        bookingBefore.rows[0],
        bookingAfter.rows[0],
      );
      const after = await this.loadOne(client, id);
      await recordAudit(client, actorUserId, "ai_draft_intake.approved_for_existing_booking", "ai_draft_intake", id, before, after);
      return after;
    });
  }

  private async mutatePending(
    id: number,
    actorUserId: number,
    operation: (client: PoolClient, before: DraftIntakeRecord) => Promise<DraftIntakeRecord>,
  ): Promise<DraftIntakeRecord> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const before = await this.loadOne(client, id, true);
      if (before.status !== "pending") throw new ConflictException("Only a pending draft can be changed");
      const result = await operation(client, before);
      await client.query("COMMIT");
      this.gateway.emitDraftIntakeUpdated(before.conversationId);
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  private async assertActiveWorkflow(client: PoolClient, requestTypeId: number, urgencyLevelId: number): Promise<void> {
    const result = await client.query<{ type_ok: boolean; urgency_ok: boolean }>(
      `SELECT EXISTS(SELECT 1 FROM request_types WHERE id = $1 AND active) AS type_ok,
              EXISTS(SELECT 1 FROM urgency_levels WHERE id = $2 AND active) AS urgency_ok`,
      [requestTypeId, urgencyLevelId],
    );
    if (!result.rows[0]?.type_ok) throw new BadRequestException("Select an active request type");
    if (!result.rows[0]?.urgency_ok) throw new BadRequestException("Select an active urgency level");
  }

  /**
   * Verifies an employee's booking choice against the client's current open
   * bookings. New and ambiguous choices must not carry a stale booking ID.
   */
  private async assertBookingSelection(
    conversationId: number,
    resolution: BookingResolution,
    matchedTravelRequestId: number | null,
  ): Promise<void> {
    if (resolution !== "matched") {
      if (matchedTravelRequestId !== null) throw new BadRequestException("Only a matched booking can have a booking ID");
      return;
    }
    if (!matchedTravelRequestId) throw new BadRequestException("Select an open booking");
    const openBookings = await this.loadOpenBookings(conversationId);
    if (!openBookings.some((booking) => booking.id === matchedTravelRequestId)) {
      throw new BadRequestException("The selected booking is closed or does not belong to this client");
    }
  }

  /**
   * Loads the recent messages in chronological order so the AI can connect a
   * short answer with the question immediately before it. Twenty messages are
   * enough for local context without sending an entire client history.
   */
  private async loadConversationContext(conversationId: number): Promise<ConversationContextMessage[]> {
    const result = await this.pool.query<ConversationContextMessage>(
      `SELECT direction, body FROM (
         SELECT direction, body, created_at, id
         FROM messages WHERE conversation_id = $1
         ORDER BY created_at DESC, id DESC LIMIT 20
       ) recent
       ORDER BY created_at, id`,
      [conversationId],
    );
    return result.rows;
  }

  /**
   * Finds the most recently approved booking in this conversation before the
   * current customer message. This preserves continuity after a separate
   * booking has already been created and the employee asks for more details.
   */
  private async loadActiveBookingContext(
    conversationId: number,
    currentMessageId: number,
  ): Promise<ActiveBookingContext | null> {
    const result = await this.pool.query<{ travel_request_id: number; request_number: string }>(
      `SELECT d.travel_request_id, r.request_number
       FROM ai_draft_intakes d
       JOIN messages source ON source.id = d.source_message_id
       JOIN messages current_message ON current_message.id = $2
       JOIN travel_requests r ON r.id = d.travel_request_id
       JOIN request_statuses rs ON rs.id = r.request_status_id
       WHERE d.conversation_id = $1
         AND d.status = 'approved'
         AND d.travel_request_id IS NOT NULL
         AND r.booking_context_closed_at IS NULL
         AND rs.code NOT IN ('completed', 'cancelled')
         AND (source.created_at, source.id) < (current_message.created_at, current_message.id)
       ORDER BY COALESCE(d.reviewed_at, d.updated_at) DESC, d.id DESC
       LIMIT 1`,
      [conversationId, currentMessageId],
    );
    const row = result.rows[0];
    return row ? { travelRequestId: row.travel_request_id, requestNumber: row.request_number } : null;
  }

  /**
   * Closes booking contexts whose work or travel has finished, then returns
   * only the client's active choices. Month-only travel dates remain open
   * through the last day of that month instead of closing on the first.
   */
  private async loadOpenBookings(conversationId: number): Promise<OpenBookingCandidate[]> {
    const link = await this.pool.query<{ client_id: number | null; group_request_id: number | null }>(
      `SELECT COALESCE(c.client_id, wg.client_id) AS client_id,
              wg.travel_request_id AS group_request_id
       FROM conversations c
       LEFT JOIN whatsapp_groups wg ON wg.conversation_id = c.id
       WHERE c.id = $1
       ORDER BY wg.id DESC NULLS LAST LIMIT 1`,
      [conversationId],
    );
    const clientId = link.rows[0]?.client_id;
    if (!clientId) return [];

    await this.pool.query(
      `UPDATE travel_requests r SET
         booking_context_closed_at = COALESCE(r.booking_context_closed_at, now()),
         booking_context_close_reason = COALESCE(r.booking_context_close_reason, 'request_' || rs.code),
         updated_at = now()
       FROM request_statuses rs
       WHERE r.request_status_id = rs.id AND r.client_id = $1
         AND r.booking_context_closed_at IS NULL
         AND rs.code IN ('completed', 'cancelled')`,
      [clientId],
    );
    await this.pool.query(
      `UPDATE travel_requests SET
         booking_context_closed_at = now(),
         booking_context_close_reason = 'travel_completed',
         updated_at = now()
       WHERE client_id = $1 AND booking_context_closed_at IS NULL
         AND CASE
           WHEN resolved_return_date IS NOT NULL AND return_date_precision = 'month'
             THEN (resolved_return_date + interval '1 month - 1 day')::date
           WHEN resolved_return_date IS NOT NULL THEN resolved_return_date
           WHEN resolved_departure_date IS NOT NULL AND departure_date_precision = 'month'
             THEN (resolved_departure_date + interval '1 month - 1 day')::date
           ELSE resolved_departure_date
         END < CURRENT_DATE`,
      [clientId],
    );

    const result = await this.pool.query<BookingCandidateRow>(
      `SELECT r.id, r.request_number, r.trip_summary, r.origin, r.destination,
              r.departure_date_text, r.return_date_text, rs.name AS request_status_name
       FROM travel_requests r
       JOIN request_statuses rs ON rs.id = r.request_status_id
       WHERE r.client_id = $1 AND r.booking_context_closed_at IS NULL
         AND rs.code NOT IN ('completed', 'cancelled')
       ORDER BY CASE WHEN r.id = $2 THEN 0 ELSE 1 END,
                r.created_at DESC, r.id DESC`,
      [clientId, link.rows[0]?.group_request_id ?? null],
    );
    return result.rows.map(toOpenBooking);
  }

  private async getBySourceMessage(messageId: number): Promise<DraftIntakeRecord | null> {
    const result = await this.pool.query<DraftRow>(`${SELECT_DRAFTS} WHERE d.source_message_id = $1`, [messageId]);
    if (!result.rows[0]) return null;
    const openBookings = await this.loadOpenBookings(result.rows[0].conversation_id);
    return toDraft(result.rows[0], openBookings);
  }

  private async getById(id: number): Promise<DraftIntakeRecord | null> {
    const result = await this.pool.query<DraftRow>(`${SELECT_DRAFTS} WHERE d.id = $1`, [id]);
    if (!result.rows[0]) return null;
    const openBookings = await this.loadOpenBookings(result.rows[0].conversation_id);
    return toDraft(result.rows[0], openBookings);
  }

  private async loadOne(client: PoolClient, id: number, lock = false): Promise<DraftIntakeRecord> {
    const result = await client.query<DraftRow>(
      `${SELECT_DRAFTS} WHERE d.id = $1${lock ? " FOR UPDATE OF d" : ""}`,
      [id],
    );
    if (!result.rows[0]) throw new NotFoundException("Draft intake not found");
    return toDraft(result.rows[0]);
  }
}
