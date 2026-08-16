export type ClickStatus = "VALID" | "DUPLICATE" | "BOT";

/**
 * Payload pushed onto the `queue:click_logs` Redis list by the
 * click-logger Fastify plugin, and consumed/batched by
 * workers/clickLogProcessor.ts. Kept flat and JSON-serializable —
 * no class instances, no undefined fields (use null instead), since
 * this crosses a process boundary via Redis.
 */
export interface ClickLogQueueItem {
  eventId: string;
  participantId: string;
  ipHash: string;
  userAgent: string | null;
  referrer: string | null;
  country: string | null;
  status: ClickStatus;
  clickedAt: string; // ISO timestamp, captured at request time
}

/**
 * Cached shape of an Event, stored under `event:{id}`. Mirrors just
 * the fields the redirect hot path needs — not the full Prisma
 * model — to keep the cached payload small and avoid leaking host
 * ownership data into a public-facing cache key.
 */
export interface CachedEvent {
  id: string;
  name: string;
  description: string | null;
  ogImageUrl: string | null;
  targetGroupUrl: string;
  status: "ACTIVE" | "EXPIRED";
  expiresAt: string; // ISO timestamp
}

/**
 * Cached shape of a refCode -> participant/event resolution, stored
 * under `link:{refCode}`. This is the single lookup the redirect
 * route needs to go from a public short code straight to scoring.
 */
export interface CachedRefCodeLink {
  refCode: string;
  participantId: string;
  eventId: string;
}

// ─────────────────────────────────────────────────────────────
// Host auth — populated by @fastify/jwt once registered in the app
// (see server.ts). Declared here so every module that reads
// `request.user` gets the same shape.
// ─────────────────────────────────────────────────────────────
export interface AuthenticatedHost {
  hostId: string;
  email: string;
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: AuthenticatedHost;
    user: AuthenticatedHost;
  }
}
