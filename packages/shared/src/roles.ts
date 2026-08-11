import { z } from "zod";

/**
 * The six staff roles from docs/03-deliverables.md P1-13..P1-18.
 * This is shared vocabulary only — Auth0 supplies coarse role claims,
 * but the actual authorization decision is re-checked against the
 * database at execution time per CLAUDE.md. Do not treat membership
 * in this enum as sufficient to authorize an action.
 */
export const STAFF_ROLES = [
  "offshore_intake_employee",
  "travel_agent",
  "supervisor_manager",
  "ticketing_agent",
  "finance_user",
  "system_administrator",
] as const;

export const staffRoleSchema = z.enum(STAFF_ROLES);

export type StaffRole = z.infer<typeof staffRoleSchema>;
