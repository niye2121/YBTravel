import { z } from "zod";

export const healthResponseSchema = z.object({
  status: z.enum(["ok", "error"]),
  db: z.enum(["connected", "unreachable"]),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;
