import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { Pool } from "pg";
import { recordAudit } from "../../database/audit";
import { PG_POOL } from "../../database/database.module";

export type TaskPriority = "low" | "normal" | "high" | "urgent";
export type SetupRole =
  | "offshore_intake_employee"
  | "travel_agent"
  | "system_administrator";
export type RequirementEntity = "client" | "traveller" | "request";

export type OnboardingStage = {
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

export type OnboardingStageInput = Omit<OnboardingStage, "id" | "createdAt" | "updatedAt">;

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
  stages: OnboardingStage[];
  requiredFields: RequiredInformationField[];
};

type StageRow = {
  id: number;
  code: string;
  name: string;
  description: string;
  position: number;
  active: boolean;
  completion_stage: boolean;
  blocks_completion_until_reviewed: boolean;
  generates_task: boolean;
  responsible_role: SetupRole | null;
  task_priority: TaskPriority;
  expected_duration_minutes: number | null;
  created_at: string;
  updated_at: string;
};

type FieldRow = {
  id: number;
  entity_type: RequirementEntity;
  field_key: string;
  label: string;
  required: boolean;
  requires_review: boolean;
  position: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

function toStage(row: StageRow): OnboardingStage {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    position: row.position,
    active: row.active,
    completionStage: row.completion_stage,
    blocksCompletionUntilReviewed: row.blocks_completion_until_reviewed,
    generatesTask: row.generates_task,
    responsibleRole: row.responsible_role,
    taskPriority: row.task_priority,
    expectedDurationMinutes: row.expected_duration_minutes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toField(row: FieldRow): RequiredInformationField {
  return {
    id: row.id,
    entityType: row.entity_type,
    fieldKey: row.field_key,
    label: row.label,
    required: row.required,
    requiresReview: row.requires_review,
    position: row.position,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const SELECT_STAGES = `
  SELECT id, code, name, description, position, active, completion_stage,
         blocks_completion_until_reviewed, generates_task, responsible_role,
         task_priority, expected_duration_minutes, created_at, updated_at
  FROM onboarding_stages
`;

const SELECT_FIELDS = `
  SELECT id, entity_type, field_key, label, required, requires_review,
         position, active, created_at, updated_at
  FROM required_information_fields
`;

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}

@Injectable()
export class WorkflowSettingsService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async get(activeOnly: boolean): Promise<WorkflowSettings> {
    const where = activeOnly ? "WHERE active = true" : "";
    const [stages, fields] = await Promise.all([
      this.pool.query<StageRow>(`${SELECT_STAGES} ${where} ORDER BY position, id`),
      this.pool.query<FieldRow>(`${SELECT_FIELDS} ${where} ORDER BY position, id`),
    ]);
    return {
      stages: stages.rows.map(toStage),
      requiredFields: fields.rows.map(toField),
    };
  }

  async createStage(input: OnboardingStageInput, actorUserId: number): Promise<OnboardingStage> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query<StageRow>(
        `INSERT INTO onboarding_stages
           (code, name, description, position, active, completion_stage,
            blocks_completion_until_reviewed, generates_task, responsible_role,
            task_priority, expected_duration_minutes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING id, code, name, description, position, active, completion_stage,
                   blocks_completion_until_reviewed, generates_task, responsible_role,
                   task_priority, expected_duration_minutes, created_at, updated_at`,
        [
          input.code,
          input.name,
          input.description,
          input.position,
          input.active,
          input.completionStage,
          input.blocksCompletionUntilReviewed,
          input.generatesTask,
          input.generatesTask ? input.responsibleRole : null,
          input.taskPriority,
          input.generatesTask ? input.expectedDurationMinutes : null,
        ],
      );
      const row = result.rows[0];
      if (!row) throw new Error("Failed to create onboarding stage");
      const created = toStage(row);
      await recordAudit(
        client,
        actorUserId,
        "onboarding_stage.created",
        "onboarding_stage",
        created.id,
        null,
        created,
      );
      await client.query("COMMIT");
      return created;
    } catch (error) {
      await client.query("ROLLBACK");
      if (isUniqueViolation(error)) {
        throw new ConflictException(
          input.completionStage
            ? "Only one onboarding stage can be the completion stage"
            : "An onboarding stage with this code already exists",
        );
      }
      throw error;
    } finally {
      client.release();
    }
  }

  async updateStage(
    id: number,
    input: OnboardingStageInput,
    actorUserId: number,
  ): Promise<OnboardingStage> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const existingResult = await client.query<StageRow>(`${SELECT_STAGES} WHERE id = $1 FOR UPDATE`, [id]);
      const existingRow = existingResult.rows[0];
      if (!existingRow) throw new NotFoundException("Onboarding stage not found");
      const result = await client.query<StageRow>(
        `UPDATE onboarding_stages
         SET code = $2, name = $3, description = $4, position = $5,
             active = $6, completion_stage = $7,
             blocks_completion_until_reviewed = $8, generates_task = $9,
             responsible_role = $10, task_priority = $11,
             expected_duration_minutes = $12, updated_at = now()
         WHERE id = $1
         RETURNING id, code, name, description, position, active, completion_stage,
                   blocks_completion_until_reviewed, generates_task, responsible_role,
                   task_priority, expected_duration_minutes, created_at, updated_at`,
        [
          id,
          input.code,
          input.name,
          input.description,
          input.position,
          input.active,
          input.completionStage,
          input.blocksCompletionUntilReviewed,
          input.generatesTask,
          input.generatesTask ? input.responsibleRole : null,
          input.taskPriority,
          input.generatesTask ? input.expectedDurationMinutes : null,
        ],
      );
      const row = result.rows[0];
      if (!row) throw new NotFoundException("Onboarding stage not found");
      const updated = toStage(row);
      await recordAudit(
        client,
        actorUserId,
        "onboarding_stage.updated",
        "onboarding_stage",
        updated.id,
        toStage(existingRow),
        updated,
      );
      await client.query("COMMIT");
      return updated;
    } catch (error) {
      await client.query("ROLLBACK");
      if (isUniqueViolation(error)) {
        throw new ConflictException(
          input.completionStage
            ? "Only one onboarding stage can be the completion stage"
            : "An onboarding stage with this code already exists",
        );
      }
      throw error;
    } finally {
      client.release();
    }
  }

  async createField(
    input: RequiredInformationFieldInput,
    actorUserId: number,
  ): Promise<RequiredInformationField> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query<FieldRow>(
        `INSERT INTO required_information_fields
           (entity_type, field_key, label, required, requires_review, position, active)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, entity_type, field_key, label, required, requires_review,
                   position, active, created_at, updated_at`,
        [
          input.entityType,
          input.fieldKey,
          input.label,
          input.required,
          input.requiresReview,
          input.position,
          input.active,
        ],
      );
      const row = result.rows[0];
      if (!row) throw new Error("Failed to create required information field");
      const created = toField(row);
      await recordAudit(
        client,
        actorUserId,
        "required_information_field.created",
        "required_information_field",
        created.id,
        null,
        created,
      );
      await client.query("COMMIT");
      return created;
    } catch (error) {
      await client.query("ROLLBACK");
      if (isUniqueViolation(error)) {
        throw new ConflictException("This entity already has a field with that key");
      }
      throw error;
    } finally {
      client.release();
    }
  }

  async updateField(
    id: number,
    input: RequiredInformationFieldInput,
    actorUserId: number,
  ): Promise<RequiredInformationField> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const existingResult = await client.query<FieldRow>(`${SELECT_FIELDS} WHERE id = $1 FOR UPDATE`, [id]);
      const existingRow = existingResult.rows[0];
      if (!existingRow) throw new NotFoundException("Required information field not found");
      const result = await client.query<FieldRow>(
        `UPDATE required_information_fields
         SET entity_type = $2, field_key = $3, label = $4, required = $5,
             requires_review = $6, position = $7, active = $8, updated_at = now()
         WHERE id = $1
         RETURNING id, entity_type, field_key, label, required, requires_review,
                   position, active, created_at, updated_at`,
        [
          id,
          input.entityType,
          input.fieldKey,
          input.label,
          input.required,
          input.requiresReview,
          input.position,
          input.active,
        ],
      );
      const row = result.rows[0];
      if (!row) throw new NotFoundException("Required information field not found");
      const updated = toField(row);
      await recordAudit(
        client,
        actorUserId,
        "required_information_field.updated",
        "required_information_field",
        updated.id,
        toField(existingRow),
        updated,
      );
      await client.query("COMMIT");
      return updated;
    } catch (error) {
      await client.query("ROLLBACK");
      if (isUniqueViolation(error)) {
        throw new ConflictException("This entity already has a field with that key");
      }
      throw error;
    } finally {
      client.release();
    }
  }
}
