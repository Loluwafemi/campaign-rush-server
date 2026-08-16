import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3001),
  HOST: z.string().default("0.0.0.0"),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  REDIS_URL: z.string().min(1, "REDIS_URL is required"),

  // Public origin used to build shareable participant links, e.g. https://domain.com/chat/{refCode}
  PUBLIC_BASE_URL: z.string().url().default("http://localhost:3001"),

  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 characters"),
  CORS_ORIGIN: z.string().min(16, "CORS_ORIGIN is required, e.g. https://domain.com or https://*.domain.com"),

  CLICK_LOG_BATCH_SIZE: z.coerce.number().int().positive().default(100),
  CLICK_LOG_BATCH_INTERVAL_MS: z.coerce.number().int().positive().default(1000),
  CLICK_LOG_FINGERPRINT_TTL_SECONDS: z.coerce.number().int().positive().default(86_400),

  // Global rate limit — applies to every route as a baseline abuse guard.
  RATE_LIMIT_GLOBAL_MAX: z.coerce.number().int().positive().default(300),
  RATE_LIMIT_GLOBAL_WINDOW_MS: z.coerce.number().int().positive().default(60_000),

  // Tighter, per-refCode limit specifically on the redirect route, since
  // that's the endpoint a click-flood attack actually targets.
  RATE_LIMIT_REDIRECT_MAX: z.coerce.number().int().positive().default(20),
  RATE_LIMIT_REDIRECT_WINDOW_MS: z.coerce.number().int().positive().default(10_000),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  process.loadEnvFile()
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    
    // preview all environment variables in the error message for easier debugging
    const envVars = Object.entries(process.env)
      .map(([key, value]) => `${key}=${value}`)
      .join("\n");

      // find database url in the env vars and display the value
      const envValue = envVars.split("\n").filter((line) => line.startsWith("DATABASE_URL=")).join("\n");
    
    // eslint-disable-next-line no-console
    console.error("Current environment variables:\n", envValue);

    // eslint-disable-next-line no-console
    console.error("❌ Invalid environment configuration:", parsed.error.flatten().fieldErrors);
    process.exit(1);
  }
  return parsed.data;
}

export const env = loadEnv();
