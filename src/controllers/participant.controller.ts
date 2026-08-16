import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "@/lib/prisma";
import { cacheRefCodeLink, getParticipantRank, redis, RedisKeys } from "@/lib/redis";
import { createLogger } from "@/lib/logger";
import { env } from "@/config/env";
import { registerParticipantSchema } from "@/schemas/participant.schema";
import { getEventById } from "@/controllers/event.controller";
import type { CachedRefCodeLink } from "@/types";

const log = createLogger("participant-controller");

const BASE62_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const REF_CODE_LENGTH = 7; // within the requested 6-8 char range
const MAX_REF_CODE_ATTEMPTS = 5;

function randomBase62(length: number): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += BASE62_ALPHABET[randomInt(0, BASE62_ALPHABET.length)];
  }
  return out;
}

/** Generates a unique refCode, retrying on the rare collision against the unique DB constraint. */
async function generateUniqueRefCode(): Promise<string> {
  for (let attempt = 1; attempt <= MAX_REF_CODE_ATTEMPTS; attempt++) {
    const candidate = randomBase62(REF_CODE_LENGTH);
    const existing = await prisma.participant.findUnique({ where: { refCode: candidate } });
    if (!existing) return candidate;
    log.warn({ candidate, attempt }, "refCode collision, retrying");
  }
  throw Object.assign(new Error("Failed to generate a unique refCode after several attempts"), {
    statusCode: 500,
  });
}

function base64url(input: Buffer | string): string {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buf.toString("base64url");
}

/**
 * Signs a compact, self-contained "mini-dashboard" access token for a
 * participant (HMAC-SHA256, no external JWT dependency). This token
 * lets a participant view their own live rank/score page without a
 * full host-style login — deliberately scoped to just
 * {participantId, eventId, exp} so it can't be used for anything else.
 */
function signParticipantAccessToken(
  participantId: string,
  eventId: string,
  expiresInSeconds = 60 * 60 * 24 * 30 // 30 days — spans the lifetime of most events
): string {
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "participant-token" }));
  const payload = base64url(
    JSON.stringify({
      participantId,
      eventId,
      exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
    })
  );
  const signature = base64url(
    createHmac("sha256", env.JWT_SECRET).update(`${header}.${payload}`).digest()
  );
  return `${header}.${payload}.${signature}`;
}

function buildShareableLink(refCode: string): string {
  return `${env.PUBLIC_BASE_URL}/chat/${refCode}`;
}

function buildPromotionalMessage(eventName: string, shareableLink: string): string {
  return (
    `🎉 Join "${eventName}"! Tap my personal invite link to hop in: ${shareableLink}\n\n` +
    `Every click through this link counts toward my spot on the leaderboard 🏆`
  );
}

interface ParticipantTokenPayload {
  participantId: string;
  eventId: string;
  exp: number;
}

/**
 * Verifies a mini-dashboard access token issued by
 * `signParticipantAccessToken` at registration time: recomputes the
 * HMAC over header+payload and compares it to the supplied signature
 * with a constant-time comparison (timing-safe against forgery
 * attempts that try to guess a valid signature byte-by-byte), then
 * checks the embedded expiry. Returns null on any failure — callers
 * treat that uniformly as "unauthenticated," without distinguishing
 * malformed vs. expired vs. forged to an attacker.
 */
function verifyParticipantAccessToken(token: string): ParticipantTokenPayload | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, payload, signature] = parts;

  const expectedSignature = base64url(
    createHmac("sha256", env.JWT_SECRET).update(`${header}.${payload}`).digest()
  );

  const sigBuf = Buffer.from(signature ?? "", "base64url");
  const expectedBuf = Buffer.from(expectedSignature, "base64url");
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }

  try {
    const decoded = JSON.parse(Buffer.from(payload ?? "", "base64url").toString("utf-8")) as ParticipantTokenPayload;
    if (typeof decoded.exp !== "number" || decoded.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

/** Extracts a bearer token from the Authorization header, or null if absent/malformed. */
function extractBearerToken(req: FastifyRequest): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim();
}

/**
 * POST /api/v1/participants/register
 * Public endpoint — anyone with a valid, active eventId can register
 * as a participant/referrer. Mints a unique refCode, persists the
 * participant, initializes their leaderboard entry at score 0, caches
 * the refCode -> {participantId, eventId} resolution for the redirect
 * hot path, and returns everything the participant's client needs to
 * start sharing immediately.
 */
export async function registerParticipant(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const input = registerParticipantSchema.parse(req.body);

  const event = await getEventById(input.eventId);
  if (!event) {
    return reply.code(404).send({ error: "NotFound", message: "Event not found" });
  }
  const isExpired = event.status === "EXPIRED" || new Date(event.expiresAt) <= new Date();
  if (isExpired) {
    return reply.code(410).send({ error: "Gone", message: "This event has expired" });
  }

  const refCode = await generateUniqueRefCode();

  const participant = await prisma.participant.create({
    data: {
      eventId: input.eventId,
      name: input.name,
      phoneNumber: input.phoneNumber,
      refCode,
      score: 0,
    },
  });

  // Initialize the live leaderboard entry at 0 so the participant
  // shows up in ZRANGE/ZREVRANGE results immediately, before their
  // first real click ever lands.
  await redis.zadd(RedisKeys.leaderboard(input.eventId), 0, participant.id);

  const refCodeLink: CachedRefCodeLink = {
    refCode: participant.refCode,
    participantId: participant.id,
    eventId: input.eventId,
  };
  await cacheRefCodeLink(refCodeLink);

  const shareableLink = buildShareableLink(participant.refCode);
  const dashboardAccessToken = signParticipantAccessToken(participant.id, input.eventId);
  const promotionalMessage = buildPromotionalMessage(event.name, shareableLink);

  log.info(
    { eventId: input.eventId, participantId: participant.id, refCode: participant.refCode },
    "Participant registered"
  );

  await reply.code(201).send({
    participant: {
      id: participant.id,
      name: participant.name,
      refCode: participant.refCode,
      score: participant.score,
      createdAt: participant.createdAt,
    },
    shareableLink,
    promotionalMessage,
    dashboardAccessToken,
  });
}

/**
 * GET /api/v1/participants/me
 * Powers the participant mini-dashboard (`/p/:refCode` on the
 * frontend). Auth is the HMAC token issued at registration, sent as
 * `Authorization: Bearer <token>` — not a host JWT, since this is a
 * participant proving they own their own referral link, not a host
 * session. Returns live score/rank straight from Redis plus the
 * event's countdown target and the same shareable link/promo message
 * from registration, so the mini-dashboard needs exactly one endpoint.
 */
export async function getMyParticipantStatus(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const token = extractBearerToken(req);
  if (!token) {
    return reply.code(401).send({ error: "Unauthorized", message: "Missing access token" });
  }

  const claims = verifyParticipantAccessToken(token);
  if (!claims) {
    return reply.code(401).send({ error: "Unauthorized", message: "Invalid or expired access token" });
  }

  const participant = await prisma.participant.findUnique({ where: { id: claims.participantId } });
  if (!participant || participant.eventId !== claims.eventId) {
    return reply.code(404).send({ error: "NotFound", message: "Participant not found" });
  }

  const event = await getEventById(claims.eventId);
  if (!event) {
    return reply.code(404).send({ error: "NotFound", message: "Event not found" });
  }

  const rankInfo = await getParticipantRank(claims.eventId, participant.id);
  const shareableLink = buildShareableLink(participant.refCode);
  const promotionalMessage = buildPromotionalMessage(event.name, shareableLink);

  await reply.send({
    participant: {
      id: participant.id,
      name: participant.name,
      refCode: participant.refCode,
      score: rankInfo?.score ?? participant.score,
    },
    rank: rankInfo?.rank ?? null,
    event: {
      id: event.id,
      name: event.name,
      status: event.status,
      expiresAt: event.expiresAt,
    },
    shareableLink,
    promotionalMessage,
  });
}
