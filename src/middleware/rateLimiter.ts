// import type { FastifyInstance, FastifyRequest } from "fastify";
// import rateLimit from "@fastify/rate-limit";
// import { env } from "@/config/env";
// import { extractClientIp } from "@/utils/fingerprint";
// import { createLogger } from "@/lib/logger";

// const log = createLogger("rate-limiter");

// /**
//  * Registers the app-wide baseline rate limit. Every route gets this
//  * unless it opts into a stricter, route-specific config (see
//  * `redirectRateLimitConfig` below). Keyed on client IP rather than
//  * the default (which also considers routeId) so a single abusive IP
//  * is throttled across every endpoint it touches, not just one.
//  */
// export async function registerRateLimiting(app: FastifyInstance): Promise<void> {
//   await app.register(rateLimit, {
//     global: true,
//     max: env.RATE_LIMIT_GLOBAL_MAX,
//     timeWindow: env.RATE_LIMIT_GLOBAL_WINDOW_MS,
//     keyGenerator: (req: FastifyRequest) => extractClientIp(req),
//     errorResponseBuilder: (req, context) => ({
//       error: "TooManyRequests",
//       message: `Rate limit exceeded. Try again in ${Math.ceil(context.ttl / 1000)}s.`,
//     }),
//     onExceeding: (req: FastifyRequest) => {
//       log.warn({ ip: extractClientIp(req), url: req.url }, "Client approaching rate limit");
//     },
//     onExceeded: (req: FastifyRequest) => {
//       log.warn({ ip: extractClientIp(req), url: req.url }, "Client exceeded rate limit");
//     },
//   });

//   log.info(
//     { max: env.RATE_LIMIT_GLOBAL_MAX, windowMs: env.RATE_LIMIT_GLOBAL_WINDOW_MS },
//     "Global rate limiting registered"
//   );
// }

// /**
//  * Route-level override for `GET /chat/:refCode` and `GET /i/:refCode`.
//  * The redirect engine is the one endpoint a click-flood attack
//  * actually targets — someone hammering a single participant's link to
//  * either inflate their score before the fingerprint dedupe catches it,
//  * or just to exhaust backend capacity. This is deliberately tighter
//  * than the global limit AND keyed on IP + refCode together, so:
//  *   - flooding one link from one IP gets throttled fast, but
//  *   - a legitimate user clicking a handful of *different* participants'
//  *     links in the same window (e.g. browsing several event invites)
//  *     isn't penalized by another link's traffic.
//  *
//  * Spread this into a route's options: `{ config: { rateLimit: redirectRateLimitConfig } }`.
//  */
// export const redirectRateLimitConfig = {
//   max: env.RATE_LIMIT_REDIRECT_MAX,
//   timeWindow: env.RATE_LIMIT_REDIRECT_WINDOW_MS,
//   keyGenerator: (req: FastifyRequest) => {
//     const refCode = (req.params as { refCode?: string } | undefined)?.refCode ?? "unknown";
//     return `redirect:${extractClientIp(req)}:${refCode}`;
//   },
//   errorResponseBuilder: (req: FastifyRequest, context: { ttl: number }) => ({
//     error: "TooManyRequests",
//     message: `Too many clicks on this link from your network. Try again in ${Math.ceil(context.ttl / 1000)}s.`,
//   }),
// };


import fp from "fastify-plugin";
import type { FastifyRequest } from "fastify";
import rateLimit from "@fastify/rate-limit";

import { env } from "@/config/env";
import { extractClientIp } from "@/utils/fingerprint";
import { createLogger } from "@/lib/logger";

const log = createLogger("rate-limiter");

/**
 * Registers the app-wide baseline rate limit.
 *
 * Every route gets this unless it opts into a stricter,
 * route-specific config (see `redirectRateLimitConfig` below).
 *
 * Keyed on client IP rather than the default (which also considers
 * routeId) so a single abusive IP is throttled across every endpoint
 * it touches, not just one.
 */
export const registerRateLimiting = fp(async (app) => {
  await app.register(rateLimit, {
    global: true,
    max: env.RATE_LIMIT_GLOBAL_MAX,
    timeWindow: env.RATE_LIMIT_GLOBAL_WINDOW_MS,

    keyGenerator: (req: FastifyRequest) =>
      extractClientIp(req),

    errorResponseBuilder: (req, context) => ({
      error: "TooManyRequests",
      message: `Rate limit exceeded. Try again in ${Math.ceil(
        context.ttl / 1000
      )}s.`,
    }),

    onExceeding: (req: FastifyRequest) => {
      log.warn(
        {
          ip: extractClientIp(req),
          url: req.url,
        },
        "Client approaching rate limit"
      );
    },

    onExceeded: (req: FastifyRequest) => {
      log.warn(
        {
          ip: extractClientIp(req),
          url: req.url,
        },
        "Client exceeded rate limit"
      );
    },
  });

  log.info(
    {
      max: env.RATE_LIMIT_GLOBAL_MAX,
      windowMs: env.RATE_LIMIT_GLOBAL_WINDOW_MS,
    },
    "Global rate limiting registered"
  );
});

/**
 * Route-level override for:
 *
 * GET /chat/:refCode
 * GET /i/:refCode
 *
 * The redirect engine is the one endpoint a click-flood attack
 * actually targets.
 *
 * This is deliberately tighter than the global limit and keyed
 * on IP + refCode together.
 */
export const redirectRateLimitConfig = {
  max: env.RATE_LIMIT_REDIRECT_MAX,

  timeWindow: env.RATE_LIMIT_REDIRECT_WINDOW_MS,

  keyGenerator: (req: FastifyRequest) => {
    const refCode =
      (req.params as { refCode?: string } | undefined)
        ?.refCode ?? "unknown";

    return `redirect:${extractClientIp(req)}:${refCode}`;
  },

  errorResponseBuilder: (
    req: FastifyRequest,
    context: { ttl: number }
  ) => ({
    error: "TooManyRequests",
    message: `Too many clicks on this link from your network. Try again in ${Math.ceil(
      context.ttl / 1000
    )}s.`,
  }),
};