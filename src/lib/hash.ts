import { createHash } from "node:crypto";
import { env } from "@/config/env";

/** Salted one-way hash of a client IP. Raw IPs are never logged or stored. */
export function hashIp(ip: string): string {
  return createHash("sha256").update(`${ip}:${env.JWT_SECRET}`).digest("hex");
}

/** Composite fingerprint from low-entropy request signals, used for dedupe. */
export function buildFingerprint(params: {
  ip: string;
  userAgent: string | null;
  acceptLanguage: string | null;
}): string {
  const raw = [params.ip, params.userAgent ?? "", params.acceptLanguage ?? ""].join("|");
  return createHash("sha256").update(raw).digest("hex");
}
