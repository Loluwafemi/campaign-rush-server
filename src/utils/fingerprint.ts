import { createHash } from "node:crypto";
import type { FastifyRequest } from "fastify";

/**
 * Per Phase 3 spec: ipHash = SHA256(IP + User-Agent + EventID). This
 * single hash serves double duty — it's the member stored in the
 * `event:{id}:fingerprints` dedupe set AND the value persisted as
 * `ClickLog.ipHash`. Combining IP + UA + EventID (rather than IP
 * alone) means the same device is tracked independently per event,
 * and a bare IP is never persisted or usable to identify a person
 * across events.
 */
export function computeIpHash(ip: string, userAgent: string | null, eventId: string): string {
  const raw = `${ip}${userAgent ?? ""}${eventId}`;
  return createHash("sha256").update(raw).digest("hex");
}

/**
 * Resolves the originating client IP, preferring the first hop in
 * X-Forwarded-For (set by the load balancer/reverse proxy in front
 * of the redirect engine) and falling back to the raw socket address.
 */
export function extractClientIp(req: FastifyRequest): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0]?.trim() ?? req.ip;
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0]?.split(",")[0]?.trim() ?? req.ip;
  }
  return req.ip;
}
