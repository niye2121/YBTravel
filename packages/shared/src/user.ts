import { z } from "zod";
import { phaseOneRoleSchema, staffRoleSchema } from "./roles";

/**
 * The safe user shape — what the API returns and the frontend displays.
 * Deliberately excludes password_hash; that field never leaves the
 * database layer.
 */
export const userSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
  roles: z.array(staffRoleSchema),
  createdAt: z.string(),
});
export type User = z.infer<typeof userSchema>;

export const staffAvailabilitySchema = z.enum(["available", "unavailable", "absent"]);
export type StaffAvailability = z.infer<typeof staffAvailabilitySchema>;

export const staffRoutingProfileInputSchema = z.object({
  active: z.boolean().default(true),
  availabilityStatus: staffAvailabilitySchema.default("available"),
  capacityLimit: z.number().int().min(1).max(500).default(10),
  highPriorityCapacityLimit: z.number().int().min(1).max(500).default(12),
  timezone: z.string().trim().min(1).max(80).default("America/New_York"),
  workdays: z.array(z.number().int().min(0).max(6)).min(1).default([1, 2, 3, 4, 5]),
  workdayStart: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).default("08:00"),
  workdayEnd: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).default("18:00"),
  eligibleRequestTypeIds: z.array(z.number().int().positive()).default([]),
});
export type StaffRoutingProfileInput = z.infer<typeof staffRoutingProfileInputSchema>;

/**
 * P1-20 (docs/03-deliverables.md) — one person can hold more than one
 * role, so this is an array, not a single value.
 */
export const createUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email(),
  phoneNumber: z.string().trim().regex(/^\+[1-9]\d{7,14}$/, "Use international format, for example +251911234567"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  roles: z.array(phaseOneRoleSchema).min(1, "Select at least one role"),
}).merge(staffRoutingProfileInputSchema);
export type CreateUserInput = z.infer<typeof createUserSchema>;

export type EmployeeSummary = User & StaffRoutingProfileInput & {
  phoneNumber: string | null;
  openRequestCount: number;
  capacityUsedPercent: number;
};

export type EmployeeAssignmentActivity = {
  id: number;
  requestId: number;
  requestNumber: string;
  clientName: string;
  eventType: string;
  routingLevel: string;
  actorName: string | null;
  explanation: string;
  createdAt: string;
};

export type EmployeeDetail = EmployeeSummary & {
  eligibleRequestTypes: Array<{ id: number; name: string }>;
  lastAssignedAt: string | null;
  recentAssignmentActivity: EmployeeAssignmentActivity[];
};

export const updateEmployeeSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(160),
  email: z.string().email(),
  phoneNumber: z.string().trim().regex(/^\+[1-9]\d{7,14}$/, "Use international format, for example +251911234567"),
  roles: z.array(phaseOneRoleSchema).min(1, "Select at least one role"),
}).merge(staffRoutingProfileInputSchema);
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const loginResponseSchema = z.object({
  token: z.string(),
  user: userSchema,
});
export type LoginResponse = z.infer<typeof loginResponseSchema>;
