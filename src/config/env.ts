import fs from "node:fs";
import path from "node:path";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  PORT: z.coerce.number().int().positive().default(3001),

  HOST: z.string().default("0.0.0.0"),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  REDIS_URL: z.string().min(1, "REDIS_URL is required"),

  // Public origin used to build shareable participant links
  // e.g. https://domain.com/chat/{refCode}
  PUBLIC_BASE_URL: z
    .string()
    .url()
    .default("http://localhost:3001"),

  JWT_SECRET: z
    .string()
    .min(16, "JWT_SECRET must be at least 16 characters"),

  CORS_ORIGIN: z
    .string()
    .min(
      1,
      "CORS_ORIGIN is required, e.g. https://domain.com or https://*.domain.com"
    ),

  CLICK_LOG_BATCH_SIZE: z.coerce
    .number()
    .int()
    .positive()
    .default(100),

  CLICK_LOG_BATCH_INTERVAL_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(1000),

  CLICK_LOG_FINGERPRINT_TTL_SECONDS: z.coerce
    .number()
    .int()
    .positive()
    .default(86_400),

  // Global rate limit
  RATE_LIMIT_GLOBAL_MAX: z.coerce
    .number()
    .int()
    .positive()
    .default(300),

  RATE_LIMIT_GLOBAL_WINDOW_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(60_000),

  // Redirect route rate limit
  RATE_LIMIT_REDIRECT_MAX: z.coerce
    .number()
    .int()
    .positive()
    .default(20),

  RATE_LIMIT_REDIRECT_WINDOW_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(10_000),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  /**
   * Load .env only when it exists.
   *
   * In production/Docker, environment variables should normally
   * be provided by the container/platform instead of requiring
   * a .env file inside the image.
   */
  const envPath = path.resolve(process.cwd(), ".env");

  if (fs.existsSync(envPath)) {
    try {
      process.loadEnvFile(envPath);
    } catch (error) {
      console.error("❌ Failed to load .env file:", error);
      process.exit(1);
    }
  }

  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error(
      "❌ Invalid environment configuration:",
      parsed.error.flatten().fieldErrors
    );

    // Only show the specific variables that are useful for debugging.
    // Do NOT print all environment variables because they may contain
    // passwords, tokens, API keys, or other secrets.
    const missingOrInvalid = parsed.error.flatten().fieldErrors;

    console.error(
      "Environment configuration errors:",
      JSON.stringify(missingOrInvalid, null, 2)
    );

    process.exit(1);
  }

  return parsed.data;
}

export const env = loadEnv();