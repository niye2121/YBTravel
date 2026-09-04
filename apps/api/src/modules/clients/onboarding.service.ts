import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { createHash } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import { recordAudit } from "../../database/audit";
import { PG_POOL } from "../../database/database.module";

type Db = Pick<Pool | PoolClient, "query">;
type EntityType = "client" | "traveller" | "request";

type RequirementRow = {
  id: number;
  entity_type: EntityType;
  field_key: string;
  label: string;
  required: boolean;
  requires_review: boolean;
  position: number;
};

type ReviewRow = {
  requirement_field_id: number;
  entity_type: EntityType;
  entity_id: number;
  value_fingerprint: string;
  reviewed_by_name: string | null;
  reviewed_at: string;
};

type StageRow = {
  id: number;
  code: string;
  name: string;
  description: string;
  position: number;
  completion_stage: boolean;
  generates_task: boolean;
  responsible_role: string | null;
  task_priority: "low" | "normal" | "high" | "urgent";
  expected_duration_minutes: number | null;
};

export type InformationChecklistItem = {
  requirementFieldId: number;
  entityType: EntityType;
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

export type OnboardingTransitionRecord = {
  id: string;
  fromStageCode: string | null;
  fromStageName: string | null;
  toStageCode: string;
  toStageName: string;
  reason: string | null;
  changedByName: string | null;
  changedAt: string;
};

export type OnboardingTaskRecord = {
  id: string;
  title: string;
  stageName: string;
  responsibleRole: string | null;
  priority: "low" | "normal" | "high" | "urgent";
  dueAt: string | null;
  status: "open" | "completed";
  completedByName: string | null;
  completedAt: string | null;
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
  transitions: OnboardingTransitionRecord[];
  tasks: OnboardingTaskRecord[];
};

export type RequestInformationStatus = {
  requestId: number;
  complete: boolean;
  missingItems: string[];
  nextAction: string;
  checklist: InformationChecklistItem[];
};

type ResolvedValue = { present: boolean; fingerprint: string; summary: string | null };

function clean(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text ? text : null;
}

function resolved(value: unknown, presentOverride?: boolean): ResolvedValue {
  const normalized = Array.isArray(value)
    ? value.map(clean)
    : typeof value === "object" && value !== null
      ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key, clean(item)]))
      : clean(value);
  const values = typeof normalized === "object" && normalized !== null
    ? Object.values(normalized)
    : [normalized];
  const present = presentOverride ?? values.some((item) => item !== null);
  const serialized = JSON.stringify(normalized);
  return {
    present,
    fingerprint: createHash("sha256").update(serialized).digest("hex"),
    summary: present ? values.filter((item) => item !== null).join(" · ").slice(0, 180) : null,
  };
}

function clientValue(fieldKey: string, row: Record<string, unknown>): ResolvedValue {
  switch (fieldKey) {
    case "legal_names": case "name": return resolved(row.name);
    case "phone_number": case "phone": return resolved(row.phone_number);
    case "client_type": return resolved(row.client_type);
    case "booking_fee_group": case "booking_fee_group_id": return resolved(row.booking_fee_group_id);
    case "preferred_representative": case "preferred_rep_id": return resolved(row.preferred_rep_id);
    case "secondary_representative": case "secondary_rep_id": return resolved(row.secondary_rep_id);
    default: return resolved(null);
  }
}

function travellerValue(fieldKey: string, row: Record<string, unknown>): ResolvedValue {
  switch (fieldKey) {
    case "legal_names": case "name": return resolved(row.name);
    case "date_of_birth": case "dob": return resolved(row.dob);
    case "nationality": return resolved(row.nationality);
    case "passport": case "passport_number": return resolved(row.passport_number);
    case "passport_expiry": case "passport_expires_on": return resolved(row.passport_expires_on);
    default: return resolved(null);
  }
}

function requestValue(fieldKey: string, row: Record<string, unknown>): ResolvedValue {
  switch (fieldKey) {
    case "airports": {
      const origin = clean(row.origin); const destination = clean(row.destination);
      return resolved({ origin, destination }, Boolean(origin && destination));
    }
    case "travel_dates": {
      const departure = clean(row.departure_date_text); const returning = clean(row.return_date_text);
      return resolved({ departure, return: returning }, Boolean(departure));
    }
    case "cabin_class": return resolved(row.cabin_class);
    case "flexibility": return resolved(row.flexibility);
    case "special_requests": return resolved(row.special_requests);
    case "passenger_count": return resolved(row.passenger_count);
    default: return resolved(null);
  }
}

@Injectable()
export class OnboardingService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  private async requirements(entityTypes: EntityType[], db: Db): Promise<RequirementRow[]> {
    const result = await db.query<RequirementRow>(
      `SELECT id, entity_type, field_key, label, required, requires_review, position
       FROM required_information_fields
       WHERE active = true AND entity_type = ANY($1::text[])
       ORDER BY position, id`,
      [entityTypes],
    );
    return result.rows;
  }

  private async reviews(db: Db, entityTypes: EntityType[], entityIds: number[]): Promise<ReviewRow[]> {
    if (entityIds.length === 0) return [];
    const result = await db.query<ReviewRow>(
      `SELECT r.requirement_field_id, r.entity_type, r.entity_id, r.value_fingerprint,
              u.name AS reviewed_by_name, r.reviewed_at
       FROM information_field_reviews r LEFT JOIN users u ON u.id = r.reviewed_by
       WHERE r.entity_type = ANY($1::text[]) AND r.entity_id = ANY($2::int[])`,
      [entityTypes, entityIds],
    );
    return result.rows;
  }

  private checklistItem(
    requirement: RequirementRow,
    entityId: number,
    entityLabel: string,
    value: ResolvedValue,
    reviews: ReviewRow[],
  ): InformationChecklistItem {
    const review = reviews.find((item) => item.requirement_field_id === requirement.id
      && item.entity_type === requirement.entity_type && item.entity_id === entityId);
    const reviewed = Boolean(review && review.value_fingerprint === value.fingerprint);
    const satisfied = requirement.required
      ? value.present && (!requirement.requires_review || reviewed)
      : !value.present || !requirement.requires_review || reviewed;
    return {
      requirementFieldId: requirement.id,
      entityType: requirement.entity_type,
      entityId,
      entityLabel,
      fieldKey: requirement.field_key,
      label: requirement.label,
      required: requirement.required,
      requiresReview: requirement.requires_review,
      present: value.present,
      reviewed,
      satisfied,
      valueSummary: value.summary,
      reviewedByName: reviewed ? review?.reviewed_by_name ?? null : null,
      reviewedAt: reviewed ? review?.reviewed_at ?? null : null,
    };
  }

  async getClientStatus(clientId: number, db: Db = this.pool): Promise<ClientOnboardingStatus> {
    // Keep these sequential because completion checks run inside a PoolClient
    // transaction, and pg clients cannot safely execute concurrent queries.
    const clientResult = await db.query<Record<string, unknown>>(
        `SELECT id, name, client_type, phone_number, booking_fee_group_id, preferred_rep_id,
                secondary_rep_id, stage FROM clients WHERE id = $1`, [clientId]);
    const travellersResult = await db.query<Record<string, unknown>>(
        `SELECT t.id, t.name, to_char(t.dob, 'YYYY-MM-DD') AS dob, t.nationality,
                t.passport_number, to_char(t.passport_expires_on, 'YYYY-MM-DD') AS passport_expires_on
         FROM travellers t JOIN traveller_accounts a ON a.traveller_id = t.id
         WHERE a.client_id = $1 ORDER BY t.name, t.id`, [clientId]);
    const requirements = await this.requirements(["client", "traveller"], db);
    const stagesResult = await db.query<StageRow>(
        `SELECT id, code, name, description, position, completion_stage, generates_task,
                responsible_role, task_priority, expected_duration_minutes
         FROM onboarding_stages WHERE active = true ORDER BY position, id`);
    const transitionsResult = await db.query<{
        id: string; from_stage_code: string | null; from_stage_name: string | null;
        to_stage_code: string; to_stage_name: string; reason: string | null;
        changed_by_name: string | null; changed_at: string;
      }>(`SELECT tr.id::text, tr.from_stage_code, fs.name AS from_stage_name,
                 tr.to_stage_code, ts.name AS to_stage_name, tr.reason,
                 u.name AS changed_by_name, tr.changed_at
          FROM client_onboarding_transitions tr
          LEFT JOIN onboarding_stages fs ON fs.code = tr.from_stage_code
          JOIN onboarding_stages ts ON ts.code = tr.to_stage_code
          LEFT JOIN users u ON u.id = tr.changed_by
          WHERE tr.client_id = $1 ORDER BY tr.changed_at DESC, tr.id DESC LIMIT 30`, [clientId]);
    const tasksResult = await db.query<{
        id: string; title: string; stage_name: string; responsible_role: string | null;
        priority: OnboardingTaskRecord["priority"]; due_at: string | null;
        status: OnboardingTaskRecord["status"]; completed_by_name: string | null; completed_at: string | null;
      }>(`SELECT task.id::text, task.title, stage.name AS stage_name, task.responsible_role,
                 task.priority, task.due_at, task.status, u.name AS completed_by_name, task.completed_at
          FROM onboarding_tasks task JOIN onboarding_stages stage ON stage.id = task.stage_id
          LEFT JOIN users u ON u.id = task.completed_by
          WHERE task.client_id = $1 ORDER BY task.status, task.due_at NULLS LAST, task.id DESC`, [clientId]);
    const client = clientResult.rows[0];
    if (!client) throw new NotFoundException("Client not found");
    const travellers = travellersResult.rows;
    const entityIds = [clientId, ...travellers.map((item) => Number(item.id))];
    const reviewRows = await this.reviews(db, ["client", "traveller"], entityIds);
    const checklist: InformationChecklistItem[] = [];
    for (const requirement of requirements) {
      if (requirement.entity_type === "client") {
        checklist.push(this.checklistItem(requirement, clientId, String(client.name), clientValue(requirement.field_key, client), reviewRows));
      } else {
        for (const traveller of travellers) {
          checklist.push(this.checklistItem(requirement, Number(traveller.id), String(traveller.name), travellerValue(requirement.field_key, traveller), reviewRows));
        }
      }
    }
    const missingItems = checklist.filter((item) => !item.satisfied)
      .map((item) => `${item.entityLabel}: ${item.label}${item.present ? " needs review" : " is missing"}`);
    if (travellers.length === 0) missingItems.unshift("Add at least one traveller to this client");
    const stages = stagesResult.rows;
    const currentStageCode = String(client.stage);
    const currentIndex = stages.findIndex((stage) => stage.code === currentStageCode);
    const current = stages[currentIndex];
    const completion = stages.find((stage) => stage.completion_stage) ?? null;
    const allowedStageCodes = [currentStageCode];
    if (currentIndex > 0) allowedStageCodes.push(...stages.slice(0, currentIndex).map((stage) => stage.code));
    if (currentIndex >= 0 && stages[currentIndex + 1]) allowedStageCodes.push(stages[currentIndex + 1]!.code);
    const openTask = tasksResult.rows.find((task) => task.status === "open");
    const nextStage = currentIndex >= 0 ? stages[currentIndex + 1] : null;
    const nextAction = missingItems[0]
      ?? (openTask ? `Complete task: ${openTask.title}` : nextStage ? `Move client to ${nextStage.name}` : "Onboarding requirements are complete");
    return {
      clientId,
      currentStageCode,
      currentStageName: current?.name ?? currentStageCode.replaceAll("_", " "),
      completionStageCode: completion?.code ?? null,
      canComplete: missingItems.length === 0,
      missingItems,
      nextAction,
      allowedStageCodes: [...new Set(allowedStageCodes)],
      checklist,
      transitions: transitionsResult.rows.map((row) => ({
        id: row.id, fromStageCode: row.from_stage_code, fromStageName: row.from_stage_name,
        toStageCode: row.to_stage_code, toStageName: row.to_stage_name, reason: row.reason,
        changedByName: row.changed_by_name, changedAt: row.changed_at,
      })),
      tasks: tasksResult.rows.map((row) => ({
        id: row.id, title: row.title, stageName: row.stage_name, responsibleRole: row.responsible_role,
        priority: row.priority, dueAt: row.due_at, status: row.status,
        completedByName: row.completed_by_name, completedAt: row.completed_at,
      })),
    };
  }

  async getRequestStatus(requestId: number, db: Db = this.pool): Promise<RequestInformationStatus> {
    const requestResult = await db.query<Record<string, unknown>>(
        `SELECT id, request_number, passenger_count, origin, destination, departure_date_text,
                return_date_text, cabin_class, flexibility, special_requests
         FROM travel_requests WHERE id = $1`, [requestId]);
    const requirements = await this.requirements(["request"], db);
    const request = requestResult.rows[0];
    if (!request) throw new NotFoundException("Travel request not found");
    const reviewRows = await this.reviews(db, ["request"], [requestId]);
    const checklist = requirements.map((requirement) => this.checklistItem(
      requirement, requestId, String(request.request_number), requestValue(requirement.field_key, request), reviewRows,
    ));
    const missingItems = checklist.filter((item) => !item.satisfied)
      .map((item) => `${item.label}${item.present ? " needs review" : " is missing"}`);
    const nextItem = checklist.find((item) => !item.satisfied);
    return {
      requestId,
      complete: missingItems.length === 0,
      missingItems,
      nextAction: nextItem
        ? `${nextItem.present ? "Review" : "Add"} ${nextItem.label.toLowerCase()}`
        : "Required request information is complete",
      checklist,
    };
  }

  async reviewClientField(
    clientId: number,
    requirementFieldId: number,
    entityType: "client" | "traveller",
    entityId: number,
    actorUserId: number,
  ): Promise<ClientOnboardingStatus> {
    const requirementResult = await this.pool.query<RequirementRow>(
      `SELECT id, entity_type, field_key, label, required, requires_review, position
       FROM required_information_fields WHERE id = $1 AND active = true`, [requirementFieldId]);
    const requirement = requirementResult.rows[0];
    if (!requirement || requirement.entity_type !== entityType) throw new BadRequestException("Required field does not match this record");
    let row: Record<string, unknown> | undefined;
    if (entityType === "client") {
      if (entityId !== clientId) throw new BadRequestException("Client field does not belong to this client");
      row = (await this.pool.query<Record<string, unknown>>(
        `SELECT id, name, client_type, phone_number, booking_fee_group_id, preferred_rep_id, secondary_rep_id
         FROM clients WHERE id = $1`, [clientId])).rows[0];
    } else {
      row = (await this.pool.query<Record<string, unknown>>(
        `SELECT t.id, t.name, to_char(t.dob, 'YYYY-MM-DD') AS dob, t.nationality,
                t.passport_number, to_char(t.passport_expires_on, 'YYYY-MM-DD') AS passport_expires_on
         FROM travellers t JOIN traveller_accounts a ON a.traveller_id = t.id
         WHERE t.id = $1 AND a.client_id = $2`, [entityId, clientId])).rows[0];
    }
    if (!row) throw new NotFoundException("Information record not found");
    const value = entityType === "client" ? clientValue(requirement.field_key, row) : travellerValue(requirement.field_key, row);
    if (!value.present) throw new BadRequestException(`${requirement.label} must be completed before review`);
    await this.saveReview(requirement, entityId, value, actorUserId);
    return this.getClientStatus(clientId);
  }

  async reviewRequestField(requestId: number, requirementFieldId: number, actorUserId: number): Promise<RequestInformationStatus> {
    const requirementResult = await this.pool.query<RequirementRow>(
      `SELECT id, entity_type, field_key, label, required, requires_review, position
       FROM required_information_fields WHERE id = $1 AND active = true`, [requirementFieldId]);
    const requirement = requirementResult.rows[0];
    if (!requirement || requirement.entity_type !== "request") throw new BadRequestException("Required field does not match this request");
    const request = (await this.pool.query<Record<string, unknown>>(
      `SELECT id, request_number, passenger_count, origin, destination, departure_date_text,
              return_date_text, cabin_class, flexibility, special_requests
       FROM travel_requests WHERE id = $1`, [requestId])).rows[0];
    if (!request) throw new NotFoundException("Travel request not found");
    const value = requestValue(requirement.field_key, request);
    if (!value.present) throw new BadRequestException(`${requirement.label} must be completed before review`);
    await this.saveReview(requirement, requestId, value, actorUserId);
    return this.getRequestStatus(requestId);
  }

  private async saveReview(requirement: RequirementRow, entityId: number, value: ResolvedValue, actorUserId: number) {
    await this.pool.query(
      `INSERT INTO information_field_reviews
         (requirement_field_id, entity_type, entity_id, value_fingerprint, reviewed_by, reviewed_at)
       VALUES ($1, $2, $3, $4, $5, now())
       ON CONFLICT (requirement_field_id, entity_type, entity_id) DO UPDATE SET
         value_fingerprint = EXCLUDED.value_fingerprint, reviewed_by = EXCLUDED.reviewed_by, reviewed_at = now()`,
      [requirement.id, requirement.entity_type, entityId, value.fingerprint, actorUserId],
    );
    await recordAudit(this.pool, actorUserId, "information_field.reviewed", "information_field_review",
      `${requirement.id}:${requirement.entity_type}:${entityId}`, null,
      { fieldKey: requirement.field_key, entityType: requirement.entity_type, entityId, valueFingerprint: value.fingerprint });
  }

  async applyStageTransition(
    db: PoolClient,
    clientId: number,
    fromStageCode: string,
    toStageCode: string,
    reason: string | null,
    actorUserId: number,
  ): Promise<void> {
    if (fromStageCode === toStageCode) return;
    const stages = (await db.query<StageRow>(
      `SELECT id, code, name, description, position, completion_stage, generates_task,
              responsible_role, task_priority, expected_duration_minutes
       FROM onboarding_stages WHERE active = true ORDER BY position, id`)).rows;
    const fromIndex = stages.findIndex((stage) => stage.code === fromStageCode);
    const toIndex = stages.findIndex((stage) => stage.code === toStageCode);
    if (toIndex < 0) throw new BadRequestException("Select an active onboarding stage");
    if (fromIndex >= 0 && toIndex > fromIndex + 1) {
      throw new BadRequestException(`Complete ${stages[fromIndex + 1]?.name ?? "the next onboarding stage"} before moving further`);
    }
    if (fromIndex >= 0 && toIndex < fromIndex && !reason?.trim()) {
      throw new BadRequestException("Explain why the client is moving back to an earlier stage");
    }
    const target = stages[toIndex]!;
    if (target.completion_stage) {
      const status = await this.getClientStatus(clientId, db);
      if (!status.canComplete) {
        throw new BadRequestException(`Client cannot be fully onboarded: ${status.missingItems.slice(0, 4).join("; ")}`);
      }
    }
    await db.query(
      `INSERT INTO client_onboarding_transitions
         (client_id, from_stage_code, to_stage_code, reason, changed_by)
       VALUES ($1, $2, $3, $4, $5)`,
      [clientId, fromStageCode, toStageCode, clean(reason), actorUserId],
    );
    if (target.generates_task) {
      await db.query(
        `INSERT INTO onboarding_tasks
           (client_id, stage_id, title, responsible_role, priority, due_at, created_by)
         VALUES ($1, $2, $3, $4, $5,
                 CASE WHEN $6::int IS NULL THEN NULL ELSE now() + make_interval(mins => $6) END, $7)`,
        [clientId, target.id, `${target.name}: ${target.description || "Complete the next onboarding action"}`,
         target.responsible_role, target.task_priority, target.expected_duration_minutes, actorUserId],
      );
    }
  }

  async recordInitialStage(db: PoolClient, clientId: number, stageCode: string, actorUserId: number): Promise<void> {
    await db.query(
      `INSERT INTO client_onboarding_transitions (client_id, from_stage_code, to_stage_code, changed_by)
       VALUES ($1, NULL, $2, $3)`, [clientId, stageCode, actorUserId]);
  }

  async completeTask(clientId: number, taskId: number, actorUserId: number): Promise<ClientOnboardingStatus> {
    const result = await this.pool.query(
      `UPDATE onboarding_tasks SET status = 'completed', completed_by = $3, completed_at = now()
       WHERE id = $1 AND client_id = $2 AND status = 'open' RETURNING id`, [taskId, clientId, actorUserId]);
    if ((result.rowCount ?? 0) === 0) throw new NotFoundException("Open onboarding task not found");
    await recordAudit(this.pool, actorUserId, "onboarding_task.completed", "onboarding_task", taskId, null,
      { clientId, status: "completed" });
    return this.getClientStatus(clientId);
  }
}
