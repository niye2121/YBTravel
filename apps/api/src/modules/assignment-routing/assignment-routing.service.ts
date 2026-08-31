import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import type { StaffRole } from "@yb-travel/shared";
import type { Pool, PoolClient } from "pg";
import { recordAudit } from "../../database/audit";
import { PG_POOL } from "../../database/database.module";

export type AssignmentMode = "recommend_only" | "automatic";
export type TeamStrategy = "lowest_workload" | "round_robin";
export type AvailabilityStatus = "available" | "unavailable" | "absent";
export type RoutingLevel = "preferred" | "secondary" | "continuity" | "team" | "escalation" | "manual";

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
  roles: StaffRole[];
  active: boolean;
  availabilityStatus: AvailabilityStatus;
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
  assignmentMode: AssignmentMode;
  teamStrategy: TeamStrategy;
  eligibleRoles: StaffRole[];
  escalationRoles: StaffRole[];
  continuityEnabled: boolean;
  workingHoursEnabled: boolean;
  urgencyPolicies: AssignmentUrgencyPolicy[];
  staffProfiles: StaffRoutingProfile[];
};

export type UpdateAssignmentSettingsInput = Omit<AssignmentSettings, "staffProfiles" | "urgencyPolicies"> & {
  urgencyPolicies: Array<Pick<AssignmentUrgencyPolicy, "urgencyLevelId" | "preferredWaitMinutes" | "secondaryWaitMinutes" | "escalationWaitMinutes">>;
  staffProfiles: Array<Omit<StaffRoutingProfile, "name" | "roles" | "openRequestCount">>;
};

export type AssignmentCandidate = {
  userId: number;
  name: string;
  routingLevel: RoutingLevel;
  eligible: boolean;
  reasons: string[];
  openRequestCount: number;
  capacityLimit: number;
};

export type AssignmentRecommendation = {
  requestId: number;
  assignmentMode: AssignmentMode;
  recommendedUserId: number | null;
  recommendedUserName: string | null;
  routingLevel: RoutingLevel;
  explanation: string;
  confirmationRequired: boolean;
  nextFallbackAt: string | null;
  candidates: AssignmentCandidate[];
};

type SettingsRow = {
  assignment_mode: AssignmentMode;
  team_strategy: TeamStrategy;
  eligible_roles: StaffRole[];
  escalation_roles: StaffRole[];
  continuity_enabled: boolean;
  working_hours_enabled: boolean;
};

type ProfileRow = {
  user_id: number;
  name: string;
  roles: StaffRole[];
  active: boolean;
  availability_status: AvailabilityStatus;
  capacity_limit: number;
  high_priority_capacity_limit: number;
  timezone: string;
  workdays: number[];
  workday_start: string;
  workday_end: string;
  eligible_request_type_ids: number[];
  open_request_count: number;
  last_assigned_at: string | null;
};

const WEEKDAY_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

function timeParts(timezone: string): { weekday: number; minutes: number } | null {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return {
      weekday: WEEKDAY_INDEX[values.weekday] ?? -1,
      minutes: Number(values.hour) * 60 + Number(values.minute),
    };
  } catch {
    return null;
  }
}

function clockMinutes(value: string): number {
  const [hour, minute] = value.slice(0, 5).split(":").map(Number);
  return hour * 60 + minute;
}

function addMinutes(value: string, minutes: number): string {
  return new Date(new Date(value).getTime() + minutes * 60_000).toISOString();
}

@Injectable()
export class AssignmentRoutingService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  private async loadSettings(db: Pool | PoolClient = this.pool): Promise<AssignmentSettings> {
    const [settingsResult, policiesResult, profilesResult] = await Promise.all([
      db.query<SettingsRow>("SELECT assignment_mode, team_strategy, eligible_roles, escalation_roles, continuity_enabled, working_hours_enabled FROM assignment_settings WHERE id = 1"),
      db.query<{
        urgency_level_id: number;
        urgency_code: string;
        urgency_name: string;
        preferred_wait_minutes: number;
        secondary_wait_minutes: number;
        escalation_wait_minutes: number;
      }>(`SELECT ul.id AS urgency_level_id, ul.code AS urgency_code, ul.name AS urgency_name,
                 p.preferred_wait_minutes, p.secondary_wait_minutes, p.escalation_wait_minutes
          FROM urgency_levels ul
          JOIN assignment_urgency_policies p ON p.urgency_level_id = ul.id
          ORDER BY ul.position, ul.id`),
      db.query<ProfileRow>(`SELECT u.id AS user_id, u.name, u.roles, u.active,
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
                 (SELECT MAX(e.created_at) FROM request_assignment_events e WHERE e.staff_user_id = u.id) AS last_assigned_at
          FROM users u
          LEFT JOIN staff_routing_profiles p ON p.user_id = u.id
          ORDER BY u.name, u.id`),
    ]);
    const row = settingsResult.rows[0];
    if (!row) throw new Error("Assignment settings are not initialized");
    return {
      assignmentMode: row.assignment_mode,
      teamStrategy: row.team_strategy,
      eligibleRoles: row.eligible_roles,
      escalationRoles: row.escalation_roles,
      continuityEnabled: row.continuity_enabled,
      workingHoursEnabled: row.working_hours_enabled,
      urgencyPolicies: policiesResult.rows.map((policy) => ({
        urgencyLevelId: policy.urgency_level_id,
        urgencyCode: policy.urgency_code,
        urgencyName: policy.urgency_name,
        preferredWaitMinutes: policy.preferred_wait_minutes,
        secondaryWaitMinutes: policy.secondary_wait_minutes,
        escalationWaitMinutes: policy.escalation_wait_minutes,
      })),
      staffProfiles: profilesResult.rows.map((profile) => ({
        userId: profile.user_id,
        name: profile.name,
        roles: profile.roles,
        active: profile.active,
        availabilityStatus: profile.availability_status,
        capacityLimit: profile.capacity_limit,
        highPriorityCapacityLimit: profile.high_priority_capacity_limit,
        timezone: profile.timezone,
        workdays: profile.workdays,
        workdayStart: profile.workday_start,
        workdayEnd: profile.workday_end,
        eligibleRequestTypeIds: profile.eligible_request_type_ids,
        openRequestCount: profile.open_request_count,
      })),
    };
  }

  getSettings(): Promise<AssignmentSettings> {
    return this.loadSettings();
  }

  async updateSettings(input: UpdateAssignmentSettingsInput, actorUserId: number): Promise<AssignmentSettings> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const before = await this.loadSettings(client);
      await client.query(
        `UPDATE assignment_settings SET assignment_mode = $1, team_strategy = $2,
           eligible_roles = $3, escalation_roles = $4, continuity_enabled = $5,
           working_hours_enabled = $6, updated_by = $7, updated_at = now() WHERE id = 1`,
        [input.assignmentMode, input.teamStrategy, input.eligibleRoles, input.escalationRoles,
         input.continuityEnabled, input.workingHoursEnabled, actorUserId],
      );
      for (const policy of input.urgencyPolicies) {
        await client.query(
          `INSERT INTO assignment_urgency_policies
             (urgency_level_id, preferred_wait_minutes, secondary_wait_minutes, escalation_wait_minutes, updated_at)
           VALUES ($1, $2, $3, $4, now())
           ON CONFLICT (urgency_level_id) DO UPDATE SET preferred_wait_minutes = EXCLUDED.preferred_wait_minutes,
             secondary_wait_minutes = EXCLUDED.secondary_wait_minutes,
             escalation_wait_minutes = EXCLUDED.escalation_wait_minutes, updated_at = now()`,
          [policy.urgencyLevelId, policy.preferredWaitMinutes, policy.secondaryWaitMinutes, policy.escalationWaitMinutes],
        );
      }
      for (const profile of input.staffProfiles) {
        await client.query("UPDATE users SET active = $2 WHERE id = $1", [profile.userId, profile.active]);
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
          [profile.userId, profile.availabilityStatus, profile.capacityLimit,
           profile.highPriorityCapacityLimit, profile.timezone, profile.workdays,
           profile.workdayStart, profile.workdayEnd, profile.eligibleRequestTypeIds, actorUserId],
        );
      }
      const after = await this.loadSettings(client);
      await recordAudit(client, actorUserId, "assignment_settings.updated", "assignment_settings", 1, before, after);
      await client.query("COMMIT");
      return after;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async recommend(requestId: number): Promise<AssignmentRecommendation> {
    const requestResult = await this.pool.query<{
      id: number;
      request_type_id: number;
      urgency_level_id: number;
      urgency_code: string;
      created_at: string;
      preferred_rep_id: number | null;
      secondary_rep_id: number | null;
      continuity_user_id: number | null;
    }>(`SELECT r.id, r.request_type_id, r.urgency_level_id, ul.code AS urgency_code, r.created_at,
               c.preferred_rep_id, c.secondary_rep_id,
               (SELECT r2.assigned_user_id FROM travel_requests r2
                JOIN request_statuses rs2 ON rs2.id = r2.request_status_id
                WHERE r2.client_id = r.client_id AND r2.id <> r.id
                  AND r2.assigned_user_id IS NOT NULL AND rs2.code NOT IN ('completed','cancelled')
                ORDER BY r2.updated_at DESC LIMIT 1) AS continuity_user_id
        FROM travel_requests r
        JOIN clients c ON c.id = r.client_id
        JOIN urgency_levels ul ON ul.id = r.urgency_level_id
        WHERE r.id = $1`, [requestId]);
    const request = requestResult.rows[0];
    if (!request) throw new BadRequestException("Travel request not found");
    const settings = await this.loadSettings();
    const policy = settings.urgencyPolicies.find((item) => item.urgencyLevelId === request.urgency_level_id);
    if (!policy) throw new BadRequestException("Assignment policy is not configured for this urgency level");
    const profilesResult = await this.pool.query<ProfileRow>(`SELECT u.id AS user_id, u.name, u.roles, u.active,
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
              WHERE r.assigned_user_id = u.id AND rs.code NOT IN ('completed','cancelled')) AS open_request_count,
             (SELECT MAX(e.created_at) FROM request_assignment_events e WHERE e.staff_user_id = u.id) AS last_assigned_at
      FROM users u LEFT JOIN staff_routing_profiles p ON p.user_id = u.id
      WHERE u.roles && $1::text[] OR u.roles && $2::text[]`, [settings.eligibleRoles, settings.escalationRoles]);

    const elapsedMinutes = Math.max(0, (Date.now() - new Date(request.created_at).getTime()) / 60_000);
    const highPriority = request.urgency_code === "high" || request.urgency_code === "urgent";
    const evaluated = profilesResult.rows.map((profile) => {
      let level: RoutingLevel = "team";
      if (profile.user_id === request.preferred_rep_id) level = "preferred";
      else if (profile.user_id === request.secondary_rep_id) level = "secondary";
      else if (settings.continuityEnabled && profile.user_id === request.continuity_user_id) level = "continuity";
      else if (!profile.roles.some((role) => settings.eligibleRoles.includes(role))) level = "escalation";
      const reasons: string[] = [];
      if (!profile.active) reasons.push("staff account is inactive");
      if (profile.availability_status !== "available") reasons.push(`marked ${profile.availability_status}`);
      if (level !== "escalation" && !profile.roles.some((role) => settings.eligibleRoles.includes(role))) reasons.push("role is not eligible");
      if (level === "escalation" && !profile.roles.some((role) => settings.escalationRoles.includes(role))) reasons.push("role is not an escalation role");
      if (profile.eligible_request_type_ids.length > 0 && !profile.eligible_request_type_ids.includes(request.request_type_id)) reasons.push("not qualified for this request type");
      const capacity = highPriority ? profile.high_priority_capacity_limit : profile.capacity_limit;
      if (profile.open_request_count >= capacity) reasons.push(`at capacity (${profile.open_request_count}/${capacity})`);
      if (settings.workingHoursEnabled) {
        const local = timeParts(profile.timezone);
        if (!local) reasons.push("working timezone is invalid");
        else if (!profile.workdays.includes(local.weekday) || local.minutes < clockMinutes(profile.workday_start) || local.minutes >= clockMinutes(profile.workday_end)) reasons.push("outside configured working hours");
      }
      return { profile, level, reasons, eligible: reasons.length === 0, capacity };
    });

    const candidates: AssignmentCandidate[] = evaluated.map(({ profile, level, reasons, eligible, capacity }) => ({
      userId: profile.user_id,
      name: profile.name,
      routingLevel: level,
      eligible,
      reasons: eligible ? ["active, available, qualified, and within capacity"] : reasons,
      openRequestCount: profile.open_request_count,
      capacityLimit: capacity,
    }));
    const eligibleAt = (level: RoutingLevel) => evaluated.filter((item) => item.level === level && item.eligible);
    let selected: (typeof evaluated)[number] | undefined;
    let nextFallbackAt: string | null = null;
    const preferred = eligibleAt("preferred")[0];
    const secondary = eligibleAt("secondary")[0];
    const continuity = eligibleAt("continuity")[0];
    if (preferred && elapsedMinutes < policy.preferredWaitMinutes) {
      selected = preferred;
      nextFallbackAt = addMinutes(request.created_at, policy.preferredWaitMinutes);
    } else if (secondary && elapsedMinutes < policy.preferredWaitMinutes + policy.secondaryWaitMinutes) {
      selected = secondary;
      nextFallbackAt = addMinutes(request.created_at, policy.preferredWaitMinutes + policy.secondaryWaitMinutes);
    } else if (continuity) {
      selected = continuity;
    } else {
      const team = eligibleAt("team").sort((a, b) => {
        if (settings.teamStrategy === "round_robin") {
          return new Date(a.profile.last_assigned_at ?? 0).getTime() - new Date(b.profile.last_assigned_at ?? 0).getTime();
        }
        const loadDifference = a.profile.open_request_count / a.capacity - b.profile.open_request_count / b.capacity;
        return loadDifference || a.profile.name.localeCompare(b.profile.name);
      });
      selected = team[0];
    }
    if (!selected) selected = eligibleAt("escalation")[0];
    const level = selected?.level ?? "escalation";
    const explanation = selected
      ? `${selected.profile.name} is recommended through the ${level} route with ${selected.profile.open_request_count} of ${selected.capacity} active requests.`
      : "No eligible staff member or escalation contact is currently available. An administrator must review this request.";
    return {
      requestId,
      assignmentMode: settings.assignmentMode,
      recommendedUserId: selected?.profile.user_id ?? null,
      recommendedUserName: selected?.profile.name ?? null,
      routingLevel: level,
      explanation,
      confirmationRequired: settings.assignmentMode === "recommend_only" || level === "escalation",
      nextFallbackAt,
      candidates,
    };
  }

  async history(requestId: number) {
    const result = await this.pool.query(`SELECT e.id, e.event_type AS "eventType", e.routing_level AS "routingLevel",
             e.staff_user_id AS "staffUserId", staff.name AS "staffUserName",
             e.actor_user_id AS "actorUserId", actor.name AS "actorUserName",
             e.explanation, e.created_at AS "createdAt"
      FROM request_assignment_events e
      LEFT JOIN users staff ON staff.id = e.staff_user_id
      LEFT JOIN users actor ON actor.id = e.actor_user_id
      WHERE e.request_id = $1 ORDER BY e.created_at DESC, e.id DESC`, [requestId]);
    return result.rows;
  }
}
