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

/**
 * P1-20 (docs/03-deliverables.md) — one person can hold more than one
 * role, so this is an array, not a single value.
 */
export const createUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  roles: z.array(phaseOneRoleSchema).min(1, "Select at least one role"),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

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
