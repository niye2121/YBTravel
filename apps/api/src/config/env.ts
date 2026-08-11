import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z
    .string()
    .regex(/^postgres(?:ql)?:\/\//, "DATABASE_URL must be a postgres connection string"),
  PORT: z.coerce.number().int().positive().default(3001),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | undefined;

/**
 * Fails fast on boot if the environment is missing or malformed, rather
 * than surfacing as a confusing runtime error the first time a module
 * touches process.env.
 */
export function loadEnv(): Env {
  if (cached) return cached;

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    // eslint-disable-next-line no-console
    console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
    process.exit(1);
  }

  cached = parsed.data;
  return cached;
}
