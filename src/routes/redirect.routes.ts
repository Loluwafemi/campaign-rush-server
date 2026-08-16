import type { FastifyInstance } from "fastify";
import { handleRedirect } from "@/controllers/redirect.controller";
import { redirectRateLimitConfig } from "@/middleware/rateLimiter";

const paramsSchema = {
  type: "object",
  required: ["refCode"],
  properties: {
    refCode: { type: "string", minLength: 6, maxLength: 8, pattern: "^[0-9A-Za-z]+$" },
  },
} as const;

/**
 * Public redirect engine. No auth. The global rate limiter (registered
 * app-wide — see src/middleware/rateLimiter.ts) applies here like
 * everywhere else, but this route additionally opts into
 * `redirectRateLimitConfig`, a tighter limit keyed on IP + refCode
 * together — this is the endpoint a click-flood attack actually
 * targets, so it gets its own stricter budget on top of the baseline.
 *
 * Both `/chat/:refCode` and `/i/:refCode` are registered against the
 * same handler: `/chat/...` reads naturally in a shared chat-invite
 * link, `/i/...` is the shorter form for constrained sharing surfaces.
 */
export async function redirectRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { refCode: string } }>(
    "/chat/:refCode",
    { schema: { params: paramsSchema }, config: { rateLimit: redirectRateLimitConfig } },
    handleRedirect
  );

  app.get<{ Params: { refCode: string } }>(
    "/i/:refCode",
    { schema: { params: paramsSchema }, config: { rateLimit: redirectRateLimitConfig } },
    handleRedirect
  );
}
