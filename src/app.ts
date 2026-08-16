import Fastify from "fastify";
import helmet from "@fastify/helmet";
import jwt from "@fastify/jwt";
import { env } from "@/config/env";
import { ZodError } from "zod";
import cors from "@fastify/cors";
import { logger } from "@/lib/logger";

import { registerRateLimiting } from "@/middleware/rateLimiter";
import { clickLoggerPlugin } from "@/plugins/clickLogger.plugin";

import { redirectRoutes } from "@/routes/redirect.routes";
import { eventRoutes } from "@/routes/event.routes";
import { participantRoutes } from "@/routes/participant.routes";
import { authRoutes } from "@/routes/auth.routes";
import { analyticsRoutes } from "@/routes/analytics.routes";

export async function buildApp() {
  const app = Fastify({
    logger,
    trustProxy: true,
    disableRequestLogging: env.NODE_ENV === "production",
  });

  
  await app.register(helmet, { contentSecurityPolicy: false });

  // Must be registered before the routes it protects, and early
  // enough to handle preflight OPTIONS requests before anything else
  // (rate limiting, auth) runs on them. The dashboards authenticate
  // with a Bearer token in the Authorization header, not cookies, so
  // `credentials: true` is deliberately omitted — that flag exists
  // for cookie/HTTP-auth CORS and would only widen the attack surface
  // here for no benefit.
const allowedOrigins = env.CORS_ORIGIN
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

await app.register(cors, {
  origin: allowedOrigins,
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
});

  await app.register(jwt, { secret: env.JWT_SECRET });
  await app.register(clickLoggerPlugin);

  app.setErrorHandler((error, req, reply) => {
    if (error instanceof ZodError) {
      return reply.code(400).send({ error: "ValidationError", issues: error.flatten() });
    }
    const statusCode = (error as { statusCode?: number }).statusCode ?? 500;
    if (statusCode >= 500) {
      req.log.error({ err: error }, "Unhandled error");
    }
    return reply.code(statusCode).send({
      error: error.name ?? "InternalServerError",
      message: statusCode >= 500 ? "Something went wrong" : error.message,
    });
  });

  app.get("/healthz", async () => ({ status: "ok", timestamp: new Date().toISOString() }));

  // Public redirect engine — mounted at root, no /api/v1 prefix, since
  // these are the short shareable links (e.g. domain.com/chat/X7k9Pq)
  // that go out over WhatsApp/SMS and need to stay short.
  await app.register(redirectRoutes);

  // Host + participant + analytics APIs, namespaced under /api/v1.
  await app.register(authRoutes, { prefix: "/api/v1" });
  await app.register(eventRoutes, { prefix: "/api/v1" });
  await app.register(participantRoutes, { prefix: "/api/v1" });
  await app.register(analyticsRoutes, { prefix: "/api/v1" });

  return app;
}