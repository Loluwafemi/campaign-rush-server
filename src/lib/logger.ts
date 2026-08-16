import pino from "pino";
import { env } from "@/config/env";

/**
 * Single shared Pino instance for the whole app. The redirect route,
 * the click-log Fastify plugin, and the standalone worker process all
 * import this so log shape (levels, base fields) stays consistent
 * across the request path and the async pipeline.
 */
export const logger = pino({
  level: env.NODE_ENV === "production" ? "info" : "debug",
  transport:
    env.NODE_ENV === "production"
      ? undefined
      : {
          target: "pino-pretty",
          options: { colorize: true, translateTime: "HH:MM:ss.l", ignore: "pid,hostname" },
        },
  base: { service: "referral-app" },
});

export type Logger = typeof logger;

/** Namespaced child logger — use one per subsystem for easy filtering. */
export function createLogger(scope: string): Logger {
  return logger.child({ scope }) as Logger;
}
