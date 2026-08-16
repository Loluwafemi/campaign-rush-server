import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getLeaderboard } from "@/lib/redis";
import { createLogger } from "@/lib/logger";
import { syncEventExpiry } from "@/controllers/event.controller";
import type { ClickStatus } from "@/types";

const log = createLogger("analytics-controller");

const eventIdParamSchema = z.object({ id: z.string().cuid() });

/** Masks a phone number to its country-code-ish prefix and last 2 digits, e.g. +9198••••89. */
function maskPhoneNumber(phone: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length <= 4) return "••••";
  const prefix = phone.startsWith("+") ? phone.slice(0, 3) : digits.slice(0, 2);
  const suffix = digits.slice(-2);
  return `${prefix}${"•".repeat(Math.max(digits.length - 4, 2))}${suffix}`;
}

/** Verifies the event exists and belongs to the authenticated host; throws a 404-shaped error otherwise. */
async function requireOwnedEvent(eventId: string, hostId: string) {
  const event = await prisma.event.findFirst({ where: { id: eventId, hostId } });
  if (!event) {
    throw Object.assign(new Error("Event not found"), { statusCode: 404 });
  }
  // Same lazy expiry flip used by getEventById/listEventsForHost, so the
  // host dashboard never shows ACTIVE for an event that's actually past
  // its expiresAt.
  return syncEventExpiry(event);
}

// ─────────────────────────────────────────────────────────────
// GET /api/v1/host/events/:id/dashboard
// ─────────────────────────────────────────────────────────────
export async function getEventDashboard(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const { id: eventId } = eventIdParamSchema.parse(req.params);
  const hostId = req.user.hostId;

  const event = await requireOwnedEvent(eventId, hostId);

  const [validClicks, duplicateClicks, botClicks, totalParticipants, liveLeaderboard] = await Promise.all([
    prisma.clickLog.count({ where: { eventId, status: "VALID" } }),
    prisma.clickLog.count({ where: { eventId, status: "DUPLICATE" } }),
    prisma.clickLog.count({ where: { eventId, status: "BOT" } }),
    prisma.participant.count({ where: { eventId } }),
    getLeaderboard(eventId, 20),
  ]);

  const totalAttempts = validClicks + duplicateClicks + botClicks;
  const duplicateBlockedRate = totalAttempts === 0 ? 0 : duplicateClicks / totalAttempts;

  const participantIds = liveLeaderboard.map((e) => e.participantId);
  const participants = participantIds.length
    ? await prisma.participant.findMany({
        where: { id: { in: participantIds } },
        select: { id: true, name: true, phoneNumber: true },
      })
    : [];
  const participantById = new Map(participants.map((p) => [p.id, p]));

  const leaderboard = liveLeaderboard.map((entry) => {
    const participant = participantById.get(entry.participantId);
    return {
      rank: entry.rank,
      participantId: entry.participantId,
      name: participant?.name ?? "Unknown",
      maskedPhoneNumber: maskPhoneNumber(participant?.phoneNumber ?? null),
      score: entry.score,
    };
  });

  await reply.send({
    event: {
      id: event.id,
      name: event.name,
      status: event.status,
      expiresAt: event.expiresAt,
    },
    metrics: {
      totalValidClicks: validClicks,
      duplicateAttempts: duplicateClicks,
      botClicks,
      totalParticipants,
      duplicateBlockedRate,
    },
    leaderboard,
  });
}

// ─────────────────────────────────────────────────────────────
// GET /api/v1/host/events/:id/logs
// ─────────────────────────────────────────────────────────────
const logsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  status: z.enum(["VALID", "DUPLICATE", "BOT"]).optional(),
  participantName: z.string().trim().min(1).max(120).optional(),
  ipHash: z.string().trim().min(1).max(128).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export async function getEventClickLogs(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const { id: eventId } = eventIdParamSchema.parse(req.params);
  const hostId = req.user.hostId;
  const query = logsQuerySchema.parse(req.query);

  await requireOwnedEvent(eventId, hostId);

  const where = {
    eventId,
    ...(query.status ? { status: query.status as ClickStatus } : {}),
    ...(query.ipHash ? { ipHash: query.ipHash } : {}),
    ...(query.participantName
      ? { participant: { name: { contains: query.participantName, mode: "insensitive" as const } } }
      : {}),
    ...(query.from || query.to
      ? {
          clickedAt: {
            ...(query.from ? { gte: query.from } : {}),
            ...(query.to ? { lte: query.to } : {}),
          },
        }
      : {}),
  };

  const [logs, total] = await Promise.all([
    prisma.clickLog.findMany({
      where,
      orderBy: { clickedAt: "desc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      include: { participant: { select: { name: true, refCode: true } } },
    }),
    prisma.clickLog.count({ where }),
  ]);

  await reply.send({
    logs: logs.map((row) => ({
      id: row.id,
      participantName: row.participant.name,
      refCode: row.participant.refCode,
      ipHash: row.ipHash,
      userAgent: row.userAgent,
      referrer: row.referrer,
      country: row.country,
      status: row.status,
      clickedAt: row.clickedAt,
    })),
    total,
    page: query.page,
    pageSize: query.pageSize,
  });
}

// ─────────────────────────────────────────────────────────────
// GET /api/v1/host/events/:id/audit
// ─────────────────────────────────────────────────────────────
const auditQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});

export async function getEventAuditLog(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const { id: eventId } = eventIdParamSchema.parse(req.params);
  const hostId = req.user.hostId;
  const query = auditQuerySchema.parse(req.query);

  await requireOwnedEvent(eventId, hostId);

  const [entries, total] = await Promise.all([
    prisma.eventAuditLog.findMany({
      where: { eventId },
      orderBy: { timestamp: "desc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.eventAuditLog.count({ where: { eventId } }),
  ]);

  await reply.send({ entries, total, page: query.page, pageSize: query.pageSize });
}
