import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { Pool, PoolClient } from "pg";
import { recordAudit } from "../../database/audit";
import { PG_POOL } from "../../database/database.module";

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

type SettingRow = {
  id: number; code: string; name: string; description: string; position: number;
  active: boolean; created_at: string; updated_at: string;
};
type Catalogue = "request_types" | "request_statuses";
type Entity = "request_type" | "request_status";

const SELECT_FIELDS = "id, code, name, description, position, active, created_at, updated_at";
const toSetting = (row: SettingRow): RequestSetting => ({
  id: row.id, code: row.code, name: row.name, description: row.description,
  position: row.position, active: row.active, createdAt: row.created_at, updatedAt: row.updated_at,
});
type UrgencyRow = SettingRow & {
  response_deadline_minutes: number | null;
  service_deadline_minutes: number | null;
};
const URGENCY_FIELDS = `${SELECT_FIELDS}, response_deadline_minutes, service_deadline_minutes`;
const toUrgency = (row: UrgencyRow): UrgencyLevel => ({
  ...toSetting(row),
  responseDeadlineMinutes: row.response_deadline_minutes,
  serviceDeadlineMinutes: row.service_deadline_minutes,
});
const isUniqueViolation = (error: unknown) =>
  typeof error === "object" && error !== null && "code" in error && error.code === "23505";

@Injectable()
export class RequestWorkflowSettingsService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async get(activeOnly: boolean): Promise<RequestWorkflowSettings> {
    const where = activeOnly ? "WHERE active = true" : "";
    const [types, statuses, urgencies] = await Promise.all([
      this.pool.query<SettingRow>(`SELECT ${SELECT_FIELDS} FROM request_types ${where} ORDER BY position, id`),
      this.pool.query<SettingRow>(`SELECT ${SELECT_FIELDS} FROM request_statuses ${where} ORDER BY position, id`),
      this.pool.query<UrgencyRow>(`SELECT ${URGENCY_FIELDS} FROM urgency_levels ${where} ORDER BY position, id`),
    ]);
    return {
      requestTypes: types.rows.map(toSetting),
      requestStatuses: statuses.rows.map(toSetting),
      urgencyLevels: urgencies.rows.map(toUrgency),
    };
  }

  createType(input: RequestSettingInput, actorId: number) { return this.create("request_types", "request_type", input, actorId); }
  createStatus(input: RequestSettingInput, actorId: number) { return this.create("request_statuses", "request_status", input, actorId); }
  updateType(id: number, input: RequestSettingInput, actorId: number) { return this.update("request_types", "request_type", id, input, actorId); }
  updateStatus(id: number, input: RequestSettingInput, actorId: number) { return this.update("request_statuses", "request_status", id, input, actorId); }
  createUrgency(input: UrgencyLevelInput, actorId: number) { return this.saveUrgency(null, input, actorId); }
  updateUrgency(id: number, input: UrgencyLevelInput, actorId: number) { return this.saveUrgency(id, input, actorId); }

  private async saveUrgency(id: number | null, input: UrgencyLevelInput, actorId: number): Promise<UrgencyLevel> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      let before: UrgencyLevel | null = null;
      if (id !== null) {
        const existing = await client.query<UrgencyRow>(`SELECT ${URGENCY_FIELDS} FROM urgency_levels WHERE id = $1 FOR UPDATE`, [id]);
        const row = existing.rows[0];
        if (!row) throw new NotFoundException("Urgency level not found");
        if (input.code !== row.code) throw new BadRequestException("Stable code cannot be changed after the record is created");
        before = toUrgency(row);
      }
      const result = id === null
        ? await client.query<UrgencyRow>(
            `INSERT INTO urgency_levels
               (code, name, description, position, response_deadline_minutes, service_deadline_minutes, active)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING ${URGENCY_FIELDS}`,
            [input.code, input.name, input.description, input.position, input.responseDeadlineMinutes, input.serviceDeadlineMinutes, input.active],
          )
        : await client.query<UrgencyRow>(
            `UPDATE urgency_levels
             SET name = $2, description = $3, position = $4,
                 response_deadline_minutes = $5, service_deadline_minutes = $6,
                 active = $7, updated_at = now()
             WHERE id = $1 RETURNING ${URGENCY_FIELDS}`,
            [id, input.name, input.description, input.position, input.responseDeadlineMinutes, input.serviceDeadlineMinutes, input.active],
          );
      const saved = toUrgency(result.rows[0]!);
      await recordAudit(client, actorId, id === null ? "urgency_level.created" : "urgency_level.updated", "urgency_level", saved.id, before, saved);
      await client.query("COMMIT");
      return saved;
    } catch (error) {
      await client.query("ROLLBACK");
      if (isUniqueViolation(error)) throw new ConflictException("An urgency level with this name or stable code already exists");
      throw error;
    } finally { client.release(); }
  }

  private async create(table: Catalogue, entity: Entity, input: RequestSettingInput, actorId: number): Promise<RequestSetting> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query<SettingRow>(
        `INSERT INTO ${table} (code, name, description, position, active)
         VALUES ($1, $2, $3, $4, $5) RETURNING ${SELECT_FIELDS}`,
        [input.code, input.name, input.description, input.position, input.active],
      );
      const created = toSetting(result.rows[0]!);
      await recordAudit(client, actorId, `${entity}.created`, entity, created.id, null, created);
      await client.query("COMMIT");
      return created;
    } catch (error) {
      await client.query("ROLLBACK");
      if (isUniqueViolation(error)) throw new ConflictException("A record with this name or stable code already exists");
      throw error;
    } finally { client.release(); }
  }

  private async update(table: Catalogue, entity: Entity, id: number, input: RequestSettingInput, actorId: number): Promise<RequestSetting> {
    const client: PoolClient = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const beforeResult = await client.query<SettingRow>(`SELECT ${SELECT_FIELDS} FROM ${table} WHERE id = $1 FOR UPDATE`, [id]);
      const beforeRow = beforeResult.rows[0];
      if (!beforeRow) throw new NotFoundException("Request workflow setting not found");
      if (input.code !== beforeRow.code) {
        throw new BadRequestException("Stable code cannot be changed after the record is created");
      }
      const result = await client.query<SettingRow>(
        `UPDATE ${table} SET name = $2, description = $3, position = $4, active = $5, updated_at = now()
         WHERE id = $1 RETURNING ${SELECT_FIELDS}`,
        [id, input.name, input.description, input.position, input.active],
      );
      const updated = toSetting(result.rows[0]!);
      await recordAudit(client, actorId, `${entity}.updated`, entity, id, toSetting(beforeRow), updated);
      await client.query("COMMIT");
      return updated;
    } catch (error) {
      await client.query("ROLLBACK");
      if (isUniqueViolation(error)) throw new ConflictException("A record with this name already exists");
      throw error;
    } finally { client.release(); }
  }
}
