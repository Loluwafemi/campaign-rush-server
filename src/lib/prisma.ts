import { PrismaClient } from "@prisma/client";
import { env } from "@/config/env";

declare global {
  // eslint-disable-next-line no-var
  var __prisma__: PrismaClient | undefined;
}

/**
 * Reused across hot reloads in dev to avoid exhausting the PG
 * connection pool. This client is used by the admin/analytics API
 * and by the click-log worker — never on the redirect hot path
 * once an event/refCode is cached in Redis (see redirect flow in
 * a later phase).
 */
export const prisma =
  global.__prisma__ ??
  new PrismaClient({
    log: env.NODE_ENV === "production" ? ["error", "warn"] : ["error", "warn", "info"],
  });

if (env.NODE_ENV !== "production") {
  global.__prisma__ = prisma;
}

export async function closePrisma(): Promise<void> {
  await prisma.$disconnect();
}
