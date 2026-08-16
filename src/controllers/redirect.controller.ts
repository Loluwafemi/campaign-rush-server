import type { FastifyReply, FastifyRequest } from "fastify";
import { getCachedRefCodeLink, cacheRefCodeLink, markFingerprintSeen, redis, RedisKeys } from "@/lib/redis";
import { prisma } from "@/lib/prisma";
import { createLogger } from "@/lib/logger";
import { env } from "@/config/env";
import { getEventById } from "@/controllers/event.controller";
import { detectBot } from "@/utils/botDetector";
import { computeIpHash, extractClientIp } from "@/utils/fingerprint";
import type { CachedRefCodeLink, ClickLogQueueItem, ClickStatus } from "@/types";

const log = createLogger("redirect-controller");

interface RedirectParams {
  refCode: string;
}

/** Escapes text dropped into the OG preview HTML to prevent tag/attribute injection. */
function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderOgPreviewHtml(params: {
  title: string;
  description: string;
  imageUrl: string;
  canonicalUrl: string;
}): string {
  const title = escapeHtml(params.title);
  const description = escapeHtml(params.description);
  const image = escapeHtml(params.imageUrl);
  const url = escapeHtml(params.canonicalUrl);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${title}</title>
<meta property="og:title" content="${title}" />
<meta property="og:description" content="${description}" />
<meta property="og:image" content="${image}" />
<meta property="og:url" content="${url}" />
<meta name="twitter:card" content="summary_large_image" />
</head>
<body>
<p><a href="${url}">${title}</a></p>
</body>
</html>`;
}

/**
 * Resolves a refCode to its {participantId, eventId}, preferring the
 * Redis cache and falling back to Postgres (re-priming the cache) on
 * a miss. This is the only place on the hot path that can touch
 * Postgres, and only when the cache has genuinely never seen this
 * refCode or it expired out of cache.
 */
async function resolveRefCodeLink(refCode: string): Promise<CachedRefCodeLink | null> {
  const cached = await getCachedRefCodeLink(refCode);
  if (cached) return cached;

  const participant = await prisma.participant.findUnique({ where: { refCode } });
  if (!participant) return null;

  const link: CachedRefCodeLink = {
    refCode: participant.refCode,
    participantId: participant.id,
    eventId: participant.eventId,
  };
  await cacheRefCodeLink(link);
  return link;
}

function buildClickLogItem(params: {
  eventId: string;
  participantId: string;
  ipHash: string;
  userAgent: string | null;
  referrer: string | null;
  status: ClickStatus;
}): ClickLogQueueItem {
  return {
    eventId: params.eventId,
    participantId: params.participantId,
    ipHash: params.ipHash,
    userAgent: params.userAgent,
    referrer: params.referrer,
    country: null, // no geo enrichment in Phase 3 scope
    status: params.status,
    clickedAt: new Date().toISOString(),
  };
}

/**
 * GET /chat/:refCode and GET /i/:refCode
 * Target: <20ms end-to-end. On the common (non-bot) path this makes
 * exactly one Redis round-trip cluster and zero synchronous Postgres
 * calls once refCode + event are cache-warm. Click persistence is
 * handed off via `request.clickLogData` to the onResponse-hook click
 * logger plugin (Phase 1), which pushes onto `queue:click_logs`
 * *after* the redirect has already been sent — never on the response
 * critical path.
 */
export async function handleRedirect(
  req: FastifyRequest<{ Params: RedirectParams }>,
  reply: FastifyReply
): Promise<void> {
  const { refCode } = req.params;
  const userAgent = req.headers["user-agent"] ?? null;
  const referrer = req.headers["referer"] ?? null;

  const link = await resolveRefCodeLink(refCode);
  if (!link) {
    await reply.code(404).type("text/plain").send("Referral link not found.");
    return;
  }

  const event = await getEventById(link.eventId);
  if (!event) {
    await reply.code(404).type("text/plain").send("Event not found.");
    return;
  }

  const isExpired = event.status === "EXPIRED" || new Date(event.expiresAt) <= new Date();
  if (isExpired) {
    await reply.code(410).type("text/plain").send("This referral event has expired.");
    return;
  }

  // ── 1. Bot / crawler detection ──────────────────────────────
  // Bots bypass click counting entirely: no fingerprint check, no
  // score increment, no redirect — just an OG-tag preview page so
  // WhatsApp/Telegram/Twitter/Facebook can unfurl a rich card.
  const botResult = detectBot(userAgent);
  if (botResult.isBot) {
    const canonicalUrl = `${env.PUBLIC_BASE_URL}/chat/${refCode}`;
    const html = renderOgPreviewHtml({
      title: event.name,
      description: event.description ?? "",
      imageUrl: event.ogImageUrl ?? "",
      canonicalUrl,
    });

    // Recorded for crawler analytics/audit only — does not affect
    // dedupe, score, or the fingerprint set.
    req.clickLogData = buildClickLogItem({
      eventId: link.eventId,
      participantId: link.participantId,
      ipHash: computeIpHash(extractClientIp(req), userAgent, link.eventId),
      userAgent,
      referrer,
      status: "BOT",
    });

    await reply
      .code(200)
      .type("text/html; charset=utf-8")
      // Security headers for the crawler-facing OG preview response.
      // This HTML is served to arbitrary UA-controlled requesters (any
      // client can claim to be WhatsApp/Telegram/etc.), so it gets the
      // same hardening as any other public HTML surface: no framing,
      // no MIME sniffing, no referrer leakage, and a locked-down CSP
      // since the page is just meta tags + one static link — it never
      // needs to run scripts or load cross-origin resources itself.
      .header("Content-Security-Policy", "default-src 'none'; img-src https: data:; style-src 'unsafe-inline'")
      .header("X-Content-Type-Options", "nosniff")
      .header("X-Frame-Options", "DENY")
      .header("Referrer-Policy", "no-referrer")
      .header("Cache-Control", "public, max-age=300") // matches the event cache TTL
      .send(html);
    return;
  }

  // ── 2. Fingerprint & duplicate check ────────────────────────
  const ip = extractClientIp(req);
  const ipHash = computeIpHash(ip, userAgent, link.eventId);

  // A single atomic SADD (return value: 1 = newly added, 0 = already
  // present) does the "check if it exists, then add" from the spec
  // in one round trip — this is what keeps the fingerprint check
  // race-free under the concurrent traffic this engine is built for,
  // instead of a separate SISMEMBER-then-SADD that two simultaneous
  // requests could both pass. markFingerprintSeen (Phase 1) also
  // refreshes the set's TTL in the same pipeline so it doesn't grow
  // unbounded.
  const { isNew } = await markFingerprintSeen(link.eventId, ipHash);
  const isDuplicate = !isNew;

  if (isDuplicate) {
    req.clickLogData = buildClickLogItem({
      eventId: link.eventId,
      participantId: link.participantId,
      ipHash,
      userAgent,
      referrer,
      status: "DUPLICATE",
    });

    await reply.code(302).header("Cache-Control", "no-store").redirect(event.targetGroupUrl);
    return;
  }

  // ── 3. Valid new click: score it ────────────────────────────
  await redis.zincrby(RedisKeys.leaderboard(link.eventId), 1, link.participantId);

  req.clickLogData = buildClickLogItem({
    eventId: link.eventId,
    participantId: link.participantId,
    ipHash,
    userAgent,
    referrer,
    status: "VALID",
  });

  await reply.code(302).header("Cache-Control", "no-store").redirect(event.targetGroupUrl);

  log.debug({ eventId: link.eventId, participantId: link.participantId }, "Valid click scored");
}
