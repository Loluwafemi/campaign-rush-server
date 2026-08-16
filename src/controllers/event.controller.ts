import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "@/lib/prisma";
import { cacheEvent, getCachedEvent } from "@/lib/redis";
import { createLogger } from "@/lib/logger";
import { createEventSchema, durationToHours, eventIdParamSchema } from "@/schemas/event.schema";
import type { CachedEvent } from "@/types";

const log = createLogger("event-controller");

/**
 * If an event is still marked ACTIVE in Postgres but its `expiresAt`
 * has passed, flips it to EXPIRED and returns the corrected status.
 * This is what actually closes the "no automated expiry sweep" gap —
 * rather than running a separate cron process, every code path that
 * reads an event through Postgres (getEventById's cache-miss branch,
 * the host's event list, the analytics dashboard) passes through here
 * first, so the status in the database is never more than one read
 * behind reality, and nothing serves a stale ACTIVE event.
 */
export async function syncEventExpiry<
  T extends { id: string; status: "ACTIVE" | "EXPIRED"; expiresAt: Date }
>(event: T): Promise<T> {
  if (event.status === "ACTIVE" && event.expiresAt <= new Date()) {
    await prisma.event.update({ where: { id: event.id }, data: { status: "EXPIRED" } });
    await prisma.eventAuditLog.create({
      data: { eventId: event.id, actionType: "EVENT_EXPIRED", metadata: { detectedOnRead: true } },
    });
    log.info({ eventId: event.id }, "Event lazily flipped to EXPIRED on read");
    return { ...event, status: "EXPIRED" };
  }
  return event;
}

/**
 * POST /api/v1/events
 * Host creates a new referral event. Computes `expiresAt` from the
 * requested duration, persists the event, primes the Redis event
 * cache so the very first participant-facing request never has to
 * fall back to Postgres, and records an audit log entry.
 */
export async function createEvent(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const input = createEventSchema.parse(req.body);
  const hostId = req.user.hostId;

  const durationHours = durationToHours(input.duration);
  const expiresAt = new Date(Date.now() + durationHours * 60 * 60 * 1000);

  const event = await prisma.event.create({
    data: {
      hostId,
      name: input.name,
      description: input.description ?? null,
      ogImageUrl: input.ogImageUrl ?? null,
      targetGroupUrl: input.targetGroupUrl,
      durationHours,
      expiresAt,
      status: "ACTIVE",
    },
  });

  // Prime the cache immediately rather than waiting for the first
  // cache-miss read — the event may go viral within seconds of
  // creation, and we want zero cold-start Postgres reads on the
  // participant-facing redirect path.
  const cachePayload: CachedEvent = {
    id: event.id,
    name: event.name,
    description: event.description,
    ogImageUrl: event.ogImageUrl,
    targetGroupUrl: event.targetGroupUrl,
    status: event.status,
    expiresAt: event.expiresAt.toISOString(),
  };
  await cacheEvent(cachePayload);

  await prisma.eventAuditLog.create({
    data: {
      eventId: event.id,
      actionType: "EVENT_CREATED",
      metadata: {
        hostId,
        durationHours,
        targetGroupUrl: event.targetGroupUrl,
      },
    },
  });

  log.info({ eventId: event.id, hostId, durationHours }, "Event created");

  await reply.code(201).send({
    event: {
      id: event.id,
      name: event.name,
      description: event.description,
      ogImageUrl: event.ogImageUrl,
      targetGroupUrl: event.targetGroupUrl,
      durationHours: event.durationHours,
      expiresAt: event.expiresAt,
      status: event.status,
      createdAt: event.createdAt,
    },
  });
}

/**
 * GET /api/v1/events/:id
 * Read-through: serves from the Redis cache when available, falls
 * back to Postgres and re-primes the cache on a miss. Not requested
 * explicitly in Phase 2 instructions but included because the
 * participant registration flow (Phase 2, item 2) needs to validate
 * an event exists and is active before creating a participant, and
 * this is the shared code path for doing that.
 */
export async function getEventById(eventId: string): Promise<CachedEvent | null> {
  const cached = await getCachedEvent(eventId);
  if (cached) return cached;

  const rawEvent = await prisma.event.findUnique({ where: { id: eventId } });
  if (!rawEvent) return null;
  const event = await syncEventExpiry(rawEvent);

  const cachePayload: CachedEvent = {
    id: event.id,
    name: event.name,
    description: event.description,
    ogImageUrl: event.ogImageUrl,
    targetGroupUrl: event.targetGroupUrl,
    status: event.status,
    expiresAt: event.expiresAt.toISOString(),
  };
  await cacheEvent(cachePayload);
  return cachePayload;
}

/**
 * GET /api/v1/events (host JWT)
 * Lists every event the authenticated host owns, most recent first.
 * Backs the host landing page — previously that page had no way to
 * show "your events" and just asked for an event ID to be typed in.
 */
export async function listEventsForHost(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const hostId = req.user.hostId;
  const rawEvents = await prisma.event.findMany({ where: { hostId }, orderBy: { createdAt: "desc" } });
  const events = await Promise.all(rawEvents.map((e) => syncEventExpiry(e)));

  await reply.send({
    events: events.map((e) => ({
      id: e.id,
      name: e.name,
      status: e.status,
      expiresAt: e.expiresAt,
      createdAt: e.createdAt,
    })),
  });
}

/**
 * GET /api/v1/events/:id/public (no auth)
 * A safe, minimal view of an event for the public "join this event"
 * page — name/description/image/status/countdown only. Deliberately
 * omits `targetGroupUrl` and `hostId`: the group link is only ever
 * reached through a participant's own `/chat/:refCode`, never handed
 * out directly, and there's no reason this endpoint needs to know
 * (or leak) who owns the event.
 */
export async function getPublicEventSummary(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const { id } = eventIdParamSchema.parse(req.params);
  const event = await getEventById(id);
  if (!event) {
    return reply.code(404).send({ error: "NotFound", message: "Event not found" });
  }

  await reply.send({
    id: event.id,
    name: event.name,
    description: event.description,
    ogImageUrl: event.ogImageUrl,
    status: event.status,
    expiresAt: event.expiresAt,
  });
}
