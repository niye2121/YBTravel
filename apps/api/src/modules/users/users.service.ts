import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import bcrypt from "bcryptjs";
import type { Pool, PoolClient } from "pg";
import type {
  CreateUserInput,
  EmployeeAssignmentActivity,
  EmployeeDetail,
  EmployeeSummary,
  StaffAvailability,
  StaffRole,
  StaffPermission,
  UpdateEmployeeInput,
} from "@yb-travel/shared";
import { backendEffectivePermissions, backendPermissionsForRoles, IMPLEMENTED_PERMISSIONS } from "../auth/permissions";
import { recordAudit } from "../../database/audit";
import { PG_POOL } from "../../database/database.module";

type EmployeeRow = {
  id: number;
  name: string;
  email: string;
  phone_number: string | null;
  roles: string[];
  active: boolean;
  availability_status: StaffAvailability;
  capacity_limit: number;
  high_priority_capacity_limit: number;
  timezone: string;
  workdays: number[];
  workday_start: string;
  workday_end: string;
  eligible_request_type_ids: number[];
  open_request_count: number;
  last_assigned_at: string | null;
  created_at: string;
  permission_overrides: Array<{ permission: StaffPermission; granted: boolean }>;
};

const employeeSelect = `
  SELECT u.id, u.name, u.email, u.phone_number, u.roles, u.active,
         COALESCE(p.availability_status, 'available') AS availability_status,
         COALESCE(p.capacity_limit, 10) AS capacity_limit,
         COALESCE(p.high_priority_capacity_limit, 12) AS high_priority_capacity_limit,
         COALESCE(p.timezone, 'America/New_York') AS timezone,
         COALESCE(p.workdays, ARRAY[1,2,3,4,5]::integer[]) AS workdays,
         COALESCE(to_char(p.workday_start, 'HH24:MI'), '08:00') AS workday_start,
         COALESCE(to_char(p.workday_end, 'HH24:MI'), '18:00') AS workday_end,
         COALESCE(p.eligible_request_type_ids, '{}'::integer[]) AS eligible_request_type_ids,
         (SELECT COUNT(*)::int FROM travel_requests r
          JOIN request_statuses rs ON rs.id = r.request_status_id
          WHERE r.assigned_user_id = u.id AND rs.code NOT IN ('completed', 'cancelled')) AS open_request_count,
         (SELECT MAX(e.created_at) FROM request_assignment_events e WHERE e.staff_user_id = u.id) AS last_assigned_at,
         COALESCE((SELECT jsonb_agg(jsonb_build_object('permission', o.permission_code, 'granted', o.granted))
                   FROM user_permission_overrides o WHERE o.user_id = u.id), '[]'::jsonb) AS permission_overrides,
         u.created_at
  FROM users u
  LEFT JOIN staff_routing_profiles p ON p.user_id = u.id`;

function toSummary(row: EmployeeRow): EmployeeSummary {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phoneNumber: row.phone_number,
    roles: row.roles as StaffRole[],
    permissions: backendEffectivePermissions(row.roles as StaffRole[], row.permission_overrides),
    active: row.active,
    availabilityStatus: row.availability_status,
    capacityLimit: row.capacity_limit,
    highPriorityCapacityLimit: row.high_priority_capacity_limit,
    timezone: row.timezone,
    workdays: row.workdays,
    workdayStart: row.workday_start,
    workdayEnd: row.workday_end,
    eligibleRequestTypeIds: row.eligible_request_type_ids,
    openRequestCount: row.open_request_count,
    capacityUsedPercent: Math.min(100, Math.round((row.open_request_count / row.capacity_limit) * 100)),
    createdAt: row.created_at,
  };
}

@Injectable()
export class UsersService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  /**
   * Rejects unknown future capability activation at the service boundary even
   * if a caller bypasses the browser's disabled checkboxes.
   */
  private assertImplementedPermissions(permissions: readonly StaffPermission[]): void {
    const implemented = new Set(IMPLEMENTED_PERMISSIONS);
    const unavailable = permissions.filter((permission) => !implemented.has(permission));
    if (unavailable.length) throw new BadRequestException(`These permissions are not implemented yet: ${unavailable.join(", ")}`);
  }

  /**
   * Stores only differences from role defaults. This keeps roles useful as
   * templates while preserving every administrator checkbox choice exactly.
   */
  private async replacePermissionOverrides(
    client: PoolClient,
    userId: number,
    roles: readonly StaffRole[],
    permissions: readonly StaffPermission[],
    actorUserId: number,
  ): Promise<void> {
    this.assertImplementedPermissions(permissions);
    const desired = new Set(permissions);
    const defaults = new Set(backendPermissionsForRoles(roles));
    await client.query("DELETE FROM user_permission_overrides WHERE user_id = $1", [userId]);
    for (const permission of IMPLEMENTED_PERMISSIONS) {
      if (desired.has(permission) === defaults.has(permission)) continue;
      await client.query(
        `INSERT INTO user_permission_overrides (user_id, permission_code, granted, changed_by)
         VALUES ($1, $2, $3, $4)`,
        [userId, permission, desired.has(permission), actorUserId],
      );
    }
  }

  private async validateRequestTypes(db: Pool | PoolClient, requestTypeIds: number[]): Promise<void> {
    if (requestTypeIds.length === 0) return;
    const uniqueIds = [...new Set(requestTypeIds)];
    const result = await db.query<{ id: number }>(
      "SELECT id FROM request_types WHERE id = ANY($1::integer[]) AND active = true",
      [uniqueIds],
    );
    if (result.rows.length !== uniqueIds.length) {
      throw new BadRequestException("One or more selected request types are inactive or invalid");
    }
  }

  async list(): Promise<EmployeeSummary[]> {
    const result = await this.pool.query<EmployeeRow>(`${employeeSelect} ORDER BY u.name ASC, u.id ASC`);
    return result.rows.map(toSummary);
  }

  async get(id: number): Promise<EmployeeDetail> {
    const result = await this.pool.query<EmployeeRow>(`${employeeSelect} WHERE u.id = $1`, [id]);
    const row = result.rows[0];
    if (!row) throw new NotFoundException("Employee not found");

    const [requestTypes, activity] = await Promise.all([
      row.eligible_request_type_ids.length === 0
        ? Promise.resolve({ rows: [] as Array<{ id: number; name: string }> })
        : this.pool.query<{ id: number; name: string }>(
            "SELECT id, name FROM request_types WHERE id = ANY($1::integer[]) ORDER BY position, id",
            [row.eligible_request_type_ids],
          ),
      this.pool.query<{
        id: number;
        request_id: number;
        request_number: string;
        client_name: string;
        event_type: string;
        routing_level: string;
        actor_name: string | null;
        explanation: string;
        created_at: string;
      }>(
        `SELECT e.id, e.request_id, r.request_number, c.name AS client_name,
                e.event_type, e.routing_level, actor.name AS actor_name,
                e.explanation, e.created_at
         FROM request_assignment_events e
         JOIN travel_requests r ON r.id = e.request_id
         JOIN clients c ON c.id = r.client_id
         LEFT JOIN users actor ON actor.id = e.actor_user_id
         WHERE e.staff_user_id = $1
         ORDER BY e.created_at DESC, e.id DESC
         LIMIT 20`,
        [id],
      ),
    ]);

    const recentAssignmentActivity: EmployeeAssignmentActivity[] = activity.rows.map((event) => ({
      id: event.id,
      requestId: event.request_id,
      requestNumber: event.request_number,
      clientName: event.client_name,
      eventType: event.event_type,
      routingLevel: event.routing_level,
      actorName: event.actor_name,
      explanation: event.explanation,
      createdAt: event.created_at,
    }));

    return {
      ...toSummary(row),
      eligibleRequestTypes: requestTypes.rows,
      lastAssignedAt: row.last_assigned_at,
      recentAssignmentActivity,
    };
  }

  async create(input: CreateUserInput, actorUserId: number): Promise<EmployeeDetail> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const existing = await client.query("SELECT 1 FROM users WHERE lower(email) = lower($1)", [input.email]);
      if ((existing.rowCount ?? 0) > 0) {
        throw new ConflictException("A user with this email already exists");
      }
      const existingPhone = await client.query("SELECT 1 FROM users WHERE phone_number = $1", [input.phoneNumber]);
      if ((existingPhone.rowCount ?? 0) > 0) {
        throw new ConflictException("A user with this phone number already exists");
      }
      await this.validateRequestTypes(client, input.eligibleRequestTypeIds);

      const passwordHash = await bcrypt.hash(input.password, 12);
      const userResult = await client.query<{ id: number }>(
        `INSERT INTO users (name, email, phone_number, password_hash, roles, active)
         VALUES ($1, lower($2), $3, $4, $5, $6)
         RETURNING id`,
        [input.name.trim(), input.email.trim(), input.phoneNumber, passwordHash, input.roles, input.active],
      );
      const id = userResult.rows[0]?.id;
      if (!id) throw new Error("Failed to create employee");

      await this.replacePermissionOverrides(client, id, input.roles, input.permissions, actorUserId);

      await client.query(
        `INSERT INTO staff_routing_profiles
           (user_id, availability_status, capacity_limit, high_priority_capacity_limit,
            timezone, workdays, workday_start, workday_end, eligible_request_type_ids, updated_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [id, input.availabilityStatus, input.capacityLimit, input.highPriorityCapacityLimit,
         input.timezone, [...new Set(input.workdays)].sort(), input.workdayStart, input.workdayEnd,
         [...new Set(input.eligibleRequestTypeIds)], actorUserId],
      );
      const after = {
        id, name: input.name.trim(), email: input.email.trim().toLowerCase(), phoneNumber: input.phoneNumber, roles: input.roles,
        active: input.active, availabilityStatus: input.availabilityStatus,
        capacityLimit: input.capacityLimit, highPriorityCapacityLimit: input.highPriorityCapacityLimit,
        timezone: input.timezone, workdays: input.workdays,
        workdayStart: input.workdayStart, workdayEnd: input.workdayEnd,
        eligibleRequestTypeIds: input.eligibleRequestTypeIds, permissions: input.permissions,
      };
      await recordAudit(client, actorUserId, "employee.created", "user", id, null, after);
      await client.query("COMMIT");
      return this.get(id);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async update(id: number, input: UpdateEmployeeInput, actorUserId: number): Promise<EmployeeDetail> {
    if (id === actorUserId && (!input.active || !input.permissions.includes("users.manage"))) {
      throw new BadRequestException("You cannot deactivate your own account or remove your user-management permission");
    }
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const existing = await client.query("SELECT id FROM users WHERE id = $1 FOR UPDATE", [id]);
      if (!existing.rows[0]) throw new NotFoundException("Employee not found");
      const duplicate = await client.query(
        "SELECT 1 FROM users WHERE lower(email) = lower($1) AND id <> $2",
        [input.email, id],
      );
      if ((duplicate.rowCount ?? 0) > 0) throw new ConflictException("A user with this email already exists");
      const duplicatePhone = await client.query(
        "SELECT 1 FROM users WHERE phone_number = $1 AND id <> $2",
        [input.phoneNumber, id],
      );
      if ((duplicatePhone.rowCount ?? 0) > 0) throw new ConflictException("A user with this phone number already exists");
      await this.validateRequestTypes(client, input.eligibleRequestTypeIds);
      const beforeResult = await client.query<EmployeeRow>(`${employeeSelect} WHERE u.id = $1`, [id]);
      const before = beforeResult.rows[0] ? toSummary(beforeResult.rows[0]) : null;

      await client.query(
        "UPDATE users SET name = $2, email = lower($3), phone_number = $4, roles = $5, active = $6 WHERE id = $1",
        [id, input.name.trim(), input.email.trim(), input.phoneNumber, input.roles, input.active],
      );
      await this.replacePermissionOverrides(client, id, input.roles, input.permissions, actorUserId);
      await client.query(
        `INSERT INTO staff_routing_profiles
           (user_id, availability_status, capacity_limit, high_priority_capacity_limit,
            timezone, workdays, workday_start, workday_end, eligible_request_type_ids, updated_by, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,now())
         ON CONFLICT (user_id) DO UPDATE SET availability_status = EXCLUDED.availability_status,
           capacity_limit = EXCLUDED.capacity_limit,
           high_priority_capacity_limit = EXCLUDED.high_priority_capacity_limit,
           timezone = EXCLUDED.timezone, workdays = EXCLUDED.workdays,
           workday_start = EXCLUDED.workday_start, workday_end = EXCLUDED.workday_end,
           eligible_request_type_ids = EXCLUDED.eligible_request_type_ids,
           updated_by = EXCLUDED.updated_by, updated_at = now()`,
        [id, input.availabilityStatus, input.capacityLimit, input.highPriorityCapacityLimit,
         input.timezone, [...new Set(input.workdays)].sort(), input.workdayStart, input.workdayEnd,
         [...new Set(input.eligibleRequestTypeIds)], actorUserId],
      );
      const afterResult = await client.query<EmployeeRow>(`${employeeSelect} WHERE u.id = $1`, [id]);
      const after = afterResult.rows[0] ? toSummary(afterResult.rows[0]) : null;
      await recordAudit(client, actorUserId, "employee.updated", "user", id, before, after);
      await client.query("COMMIT");
      return this.get(id);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}
