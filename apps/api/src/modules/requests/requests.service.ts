import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException, Optional } from "@nestjs/common";
import type { StaffRole } from "@yb-travel/shared";
import type { Pool } from "pg";
import { recordAudit } from "../../database/audit";
import { PG_POOL } from "../../database/database.module";
import { AssignmentRoutingService, type AssignmentRecommendation } from "../assignment-routing/assignment-routing.service";

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

export type AssignableStaffRecord = {
  id: number;
  name: string;
  roles: StaffRole[];
};

type RequestRow = {
  id: number;
  request_number: string;
  client_id: number;
  client_name: string;
  trip_summary: string;
  request_type_id: number;
  request_type_code: string;
  request_type_name: string;
  request_status_id: number;
  request_status_code: string;
  request_status_name: string;
  urgency_level_id: number;
  urgency_code: string;
  urgency_name: string;
  response_due_at: string | null;
  service_due_at: string | null;
  assigned_user_id: number | null;
  assigned_user_name: string | null;
  assigned_at: string | null;
  assigned_by_user_id: number | null;
  assigned_by_user_name: string | null;
  assignment_status: "unassigned" | "recommended" | "assigned" | "reassignment_needed" | "escalated";
  source_conversation_id: number | null;
  proposed_reply: string | null;
  client_whatsapp_number: string | null;
  created_at: string;
};

function toRequest(row: RequestRow): TravelRequestRecord {
  return {
    id: row.id,
    requestNumber: row.request_number,
    clientId: row.client_id,
    clientName: row.client_name,
    tripSummary: row.trip_summary,
    requestTypeId: row.request_type_id,
    requestTypeCode: row.request_type_code,
    requestTypeName: row.request_type_name,
    requestStatusId: row.request_status_id,
    requestStatusCode: row.request_status_code,
    requestStatusName: row.request_status_name,
    urgencyLevelId: row.urgency_level_id,
    urgencyCode: row.urgency_code,
    urgencyName: row.urgency_name,
    responseDueAt: row.response_due_at,
    serviceDueAt: row.service_due_at,
    assignedUserId: row.assigned_user_id,
    assignedUserName: row.assigned_user_name,
    assignedAt: row.assigned_at,
    assignedByUserId: row.assigned_by_user_id,
    assignedByUserName: row.assigned_by_user_name,
    assignmentStatus: row.assignment_status,
    sourceConversationId: row.source_conversation_id,
    proposedReply: row.proposed_reply,
    clientWhatsAppNumber: row.client_whatsapp_number,
    createdAt: row.created_at,
  };
}

const SELECT_REQUESTS = `
  SELECT r.id, r.request_number, r.client_id, c.name AS client_name,
         r.trip_summary, r.request_type_id, rt.code AS request_type_code,
         rt.name AS request_type_name, r.request_status_id,
         rs.code AS request_status_code, rs.name AS request_status_name,
         r.urgency_level_id, ul.code AS urgency_code, ul.name AS urgency_name,
         r.response_due_at, r.service_due_at,
         r.assigned_user_id, assigned_user.name AS assigned_user_name,
         r.assigned_at, r.assigned_by_user_id,
         assigned_by.name AS assigned_by_user_name,
         r.assignment_status,
         source_draft.conversation_id AS source_conversation_id,
         source_draft.suggested_reply AS proposed_reply,
         source_conversation.phone_number AS client_whatsapp_number,
         r.created_at
  FROM travel_requests r
  JOIN clients c ON c.id = r.client_id
  JOIN request_types rt ON rt.id = r.request_type_id
  JOIN request_statuses rs ON rs.id = r.request_status_id
  JOIN urgency_levels ul ON ul.id = r.urgency_level_id
  LEFT JOIN users assigned_user ON assigned_user.id = r.assigned_user_id
  LEFT JOIN users assigned_by ON assigned_by.id = r.assigned_by_user_id
  LEFT JOIN ai_draft_intakes source_draft ON source_draft.id = r.source_draft_intake_id
  LEFT JOIN conversations source_conversation ON source_conversation.id = source_draft.conversation_id
`;

@Injectable()
export class RequestsService {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    @Optional() private readonly routing?: AssignmentRoutingService,
  ) {}

  async list(): Promise<TravelRequestRecord[]> {
    const result = await this.pool.query<RequestRow>(
      `${SELECT_REQUESTS} ORDER BY r.created_at DESC, r.id DESC`,
    );
    return result.rows.map(toRequest);
  }

  async getById(id: number): Promise<TravelRequestRecord> {
    const result = await this.pool.query<RequestRow>(`${SELECT_REQUESTS} WHERE r.id = $1`, [id]);
    const row = result.rows[0];
    if (!row) throw new NotFoundException("Travel request not found");
    return toRequest(row);
  }

  async listAssignableStaff(): Promise<AssignableStaffRecord[]> {
    const result = await this.pool.query<{ id: number; name: string; roles: StaffRole[] }>(
      `SELECT id, name, roles
       FROM users
       WHERE roles && ARRAY['travel_agent', 'offshore_intake_employee']::text[]
       ORDER BY name ASC, id ASC`,
    );
    return result.rows;
  }

  getAssignmentRecommendation(id: number): Promise<AssignmentRecommendation> {
    if (!this.routing) throw new Error("Assignment routing is unavailable");
    return this.routing.recommend(id);
  }

  getAssignmentHistory(id: number) {
    if (!this.routing) throw new Error("Assignment routing is unavailable");
    return this.routing.history(id);
  }

  async assign(
    id: number,
    assignedUserId: number,
    actorUserId: number,
    actorRoles: StaffRole[],
    automatic = false,
  ): Promise<TravelRequestRecord> {
    const recommendation = this.routing ? await this.routing.recommend(id) : null;
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const beforeResult = await client.query<RequestRow>(`${SELECT_REQUESTS} WHERE r.id = $1 FOR UPDATE OF r`, [id]);
      const beforeRow = beforeResult.rows[0];
      if (!beforeRow) throw new NotFoundException("Travel request not found");
      const before = toRequest(beforeRow);

      const staffResult = await client.query<{ id: number; roles: StaffRole[] }>(
        `SELECT id, roles FROM users WHERE id = $1`,
        [assignedUserId],
      );
      const target = staffResult.rows[0];
      if (!target || !target.roles.some((role) => role === "travel_agent" || role === "offshore_intake_employee")) {
        throw new BadRequestException("Select an eligible Travel Agent or Offshore Intake Employee");
      }

      const mayManageAssignments = actorRoles.some(
        (role) => role === "system_administrator" || role === "offshore_intake_employee",
      );
      if (!mayManageAssignments) {
        const mayClaimSelf =
          actorRoles.includes("travel_agent") &&
          actorUserId === assignedUserId &&
          before.assignedUserId === null;
        if (!mayClaimSelf) {
          throw new ForbiddenException("Travel Agents may only assign an unassigned request to themselves");
        }
      }

      if (before.assignedUserId === assignedUserId) {
        await client.query("COMMIT");
        return before;
      }

      await client.query(
        `UPDATE travel_requests
         SET assigned_user_id = $2,
             assigned_at = now(),
             assigned_by_user_id = $3,
             assignment_status = 'assigned',
             updated_at = now()
         WHERE id = $1`,
        [id, assignedUserId, actorUserId],
      );
      const afterResult = await client.query<RequestRow>(`${SELECT_REQUESTS} WHERE r.id = $1`, [id]);
      const afterRow = afterResult.rows[0];
      if (!afterRow) throw new Error("Failed to load assigned travel request");
      const after = toRequest(afterRow);
      await recordAudit(
        client,
        actorUserId,
        before.assignedUserId === null ? "travel_request.assigned" : "travel_request.reassigned",
        "travel_request",
        id,
        before,
        after,
      );
      const recommendationMatched = recommendation?.recommendedUserId === assignedUserId;
      const eventType = automatic
        ? "automatic_assigned"
        : recommendation && !recommendationMatched
          ? "override"
          : before.assignedUserId === null ? "assigned" : "reassigned";
      const routingLevel = recommendationMatched ? recommendation!.routingLevel : "manual";
      const explanation = recommendationMatched
        ? recommendation!.explanation
        : recommendation
          ? `${after.assignedUserName ?? "Selected staff"} was assigned manually instead of the recommendation for ${recommendation.recommendedUserName ?? "no available staff"}.`
          : `${after.assignedUserName ?? "Selected staff"} was assigned manually.`;
      await client.query(
        `INSERT INTO request_assignment_events
           (request_id, event_type, routing_level, staff_user_id, actor_user_id, explanation, recommendation_snapshot)
         VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb)`,
        [id, eventType, routingLevel, assignedUserId, actorUserId, explanation, JSON.stringify(recommendation ?? {})],
      );
      await client.query(
        `INSERT INTO staff_notifications
           (user_id, notification_type, title, message, entity_type, entity_id, created_by)
         VALUES ($1, 'request_assigned', $2, $3, 'travel_request', $4, $5)`,
        [
          assignedUserId,
          `${after.requestNumber} assigned to you`,
          `${after.clientName} · ${after.tripSummary}`,
          String(id),
          actorUserId,
        ],
      );
      await client.query("COMMIT");
      return after;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async create(
    clientId: number,
    tripSummary: string,
    actorUserId: number,
    requestTypeId?: number,
    urgencyLevelId?: number,
    sourceDraftIntakeId?: number,
  ): Promise<TravelRequestRecord> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const clientExists = await client.query("SELECT 1 FROM clients WHERE id = $1", [clientId]);
      if ((clientExists.rowCount ?? 0) === 0) throw new BadRequestException("Client not found");

      const typeResult = requestTypeId
        ? await client.query<{ id: number }>("SELECT id FROM request_types WHERE id = $1 AND active = true", [requestTypeId])
        : await client.query<{ id: number }>("SELECT id FROM request_types WHERE code = 'new_flight_booking' AND active = true");
      const statusResult = await client.query<{ id: number }>("SELECT id FROM request_statuses WHERE code = 'new' AND active = true");
      const urgencyResult = await client.query<{
        id: number;
        response_deadline_minutes: number | null;
        service_deadline_minutes: number | null;
      }>(
        `SELECT id, response_deadline_minutes, service_deadline_minutes
         FROM urgency_levels
         WHERE ${urgencyLevelId ? "id = $1" : "code = 'normal'"} AND active = true`,
        urgencyLevelId ? [urgencyLevelId] : [],
      );
      const typeId = typeResult.rows[0]?.id;
      const statusId = statusResult.rows[0]?.id;
      const urgency = urgencyResult.rows[0];
      if (!typeId) throw new BadRequestException("Select an active request type");
      if (!statusId) throw new BadRequestException("The New request status is not active");
      if (!urgency) throw new BadRequestException("The Normal urgency level is not active");

      const inserted = await client.query<{ id: number }>(
        `INSERT INTO travel_requests
           (client_id, trip_summary, status, request_type_id, request_status_id,
            urgency_level_id, response_due_at, service_due_at, created_by, source_draft_intake_id)
         VALUES ($1, $2, 'new', $3, $4, $5,
                 CASE WHEN $6::int IS NULL THEN NULL ELSE now() + make_interval(mins => $6) END,
                 CASE WHEN $7::int IS NULL THEN NULL ELSE now() + make_interval(mins => $7) END,
                 $8, $9) RETURNING id`,
        [clientId, tripSummary, typeId, statusId, urgency.id,
         urgency.response_deadline_minutes, urgency.service_deadline_minutes, actorUserId,
         sourceDraftIntakeId ?? null],
      );
      const id = inserted.rows[0]?.id;
      if (!id) throw new Error("Failed to create travel request");
      const loaded = await client.query<RequestRow>(`${SELECT_REQUESTS} WHERE r.id = $1`, [id]);
      const row = loaded.rows[0];
      if (!row) throw new Error("Failed to load travel request");
      const created = toRequest(row);
      await recordAudit(
        client,
        actorUserId,
        "travel_request.created",
        "travel_request",
        id,
        null,
        created,
      );
      await client.query("COMMIT");
      if (this.routing) {
        const recommendation = await this.routing.recommend(id);
        if (recommendation.assignmentMode === "automatic" && recommendation.recommendedUserId && recommendation.routingLevel !== "escalation") {
          return this.assign(id, recommendation.recommendedUserId, actorUserId, ["system_administrator"], true);
        }
      }
      return created;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}
