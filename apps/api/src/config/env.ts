import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z
    .string()
    .regex(/^postgres(?:ql)?:\/\//, "DATABASE_URL must be a postgres connection string"),
  PORT: z.coerce.number().int().positive().default(3001),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_SECRET_PREVIOUS: z.string().optional(),
  AI_SECRETS_ENCRYPTION_KEY: z.string().optional(),
  AI_SECRETS_ENCRYPTION_KEY_PREVIOUS: z.string().optional(),
  CORS_ALLOWED_ORIGINS: z.string().default("http://localhost:5173"),
  TRUST_PROXY: z.enum(["true", "false"]).default("false"),
  LOGIN_RATE_LIMIT_MAX_FAILURES: z.coerce.number().int().min(3).max(20).default(5),
  LOGIN_RATE_LIMIT_WINDOW_MINUTES: z.coerce.number().int().min(1).max(1440).default(15),
  LOGIN_RATE_LIMIT_LOCK_MINUTES: z.coerce.number().int().min(1).max(1440).default(15),
  BACKUP_ENCRYPTION_KEY: z.string().optional(),
}).superRefine((value, context) => {
  if (value.NODE_ENV === "production" && value.JWT_SECRET.includes("dev-only")) {
    context.addIssue({ code: "custom", path: ["JWT_SECRET"], message: "Production must use a rotated, non-development JWT secret" });
  }
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
