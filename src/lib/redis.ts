import Redis from "ioredis";
import { env } from "@/config/env";
import { createLogger } from "@/lib/logger";
import type { CachedEvent, CachedRefCodeLink, ClickLogQueueItem } from "@/types";

const log = createLogger("redis");

/**
 * Single shared connection for request-path reads/writes (event
 * cache, refCode lookup, fingerprint dedupe, leaderboard, and
 * pushing onto the click-log queue). The click-log worker opens its
 * own separate connection (see workers/clickLogProcessor.ts) so its
 * blocking BLPOP calls never contend with this one.
 */
export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 2,
  enableAutoPipelining: true,
  lazyConnect: false,
});

redis.on("connect", () => log.info("Redis connected"));
redis.on("error", (err) => log.error({ err }, "Redis connection error"));

export async function closeRedis(): Promise<void> {
  await redis.quit();
}

// ─────────────────────────────────────────────────────────────
// Key namespaces — centralised so every module derives keys the
// same way and TTLs stay consistent.
// ─────────────────────────────────────────────────────────────
export const RedisKeys = {
  event: (eventId: string) => `event:${eventId}`,
  refCodeLink: (refCode: string) => `link:${refCode}`,
  fingerprintSet: (eventId: string) => `event:${eventId}:fingerprints`,
  leaderboard: (eventId: string) => `event:${eventId}:leaderboard`,
  clickLogQueue: "queue:click_logs",
} as const;

// Cache TTLs, in seconds.
const EVENT_CACHE_TTL_SECONDS = 300; // 5 min — long enough to absorb burst traffic, short enough to reflect edits
const REF_CODE_CACHE_TTL_SECONDS = 300;

// ─────────────────────────────────────────────────────────────
// 1. Active Event caching — `event:{id}`
// ─────────────────────────────────────────────────────────────

/** Cache an event's redirect-relevant fields. Called after a DB read or on event create/update. */
export async function cacheEvent(event: CachedEvent): Promise<void> {
  await redis.set(RedisKeys.event(event.id), JSON.stringify(event), "EX", EVENT_CACHE_TTL_SECONDS);
}

/** Read a cached event. Returns null on a cache miss — caller is responsible for the DB fallback. */
export async function getCachedEvent(eventId: string): Promise<CachedEvent | null> {
  const raw = await redis.get(RedisKeys.event(eventId));
  return raw ? (JSON.parse(raw) as CachedEvent) : null;
}

/** Invalidate an event's cache — call this on any host-side edit (status change, name change, etc). */
export async function invalidateEvent(eventId: string): Promise<void> {
  await redis.del(RedisKeys.event(eventId));
}

// ─────────────────────────────────────────────────────────────
// 2. Participant refCode lookup — `link:{refCode}`
// ─────────────────────────────────────────────────────────────

/** Cache the refCode -> {participantId, eventId} resolution used by the redirect route. */
export async function cacheRefCodeLink(link: CachedRefCodeLink): Promise<void> {
  await redis.set(
    RedisKeys.refCodeLink(link.refCode),
    JSON.stringify(link),
    "EX",
    REF_CODE_CACHE_TTL_SECONDS
  );
}

export async function getCachedRefCodeLink(refCode: string): Promise<CachedRefCodeLink | null> {
  const raw = await redis.get(RedisKeys.refCodeLink(refCode));
  return raw ? (JSON.parse(raw) as CachedRefCodeLink) : null;
}

export async function invalidateRefCodeLink(refCode: string): Promise<void> {
  await redis.del(RedisKeys.refCodeLink(refCode));
}

// ─────────────────────────────────────────────────────────────
// 3. Fingerprint deduplication — `event:{id}:fingerprints`
// ─────────────────────────────────────────────────────────────

/**
 * Atomically records a fingerprint as seen for this event and reports
 * whether it was new. Backed by a Redis Set with a TTL refreshed on
 * every write — under high concurrency, SADD's return value (1 = new
 * member added, 0 = already present) is itself race-free, so no
 * separate SISMEMBER check-then-set is needed.
 */
export async function markFingerprintSeen(
  eventId: string,
  fingerprint: string
): Promise<{ isNew: boolean }> {
  const key = RedisKeys.fingerprintSet(eventId);
  const pipeline = redis.pipeline();
  pipeline.sadd(key, fingerprint);
  pipeline.expire(key, env.CLICK_LOG_FINGERPRINT_TTL_SECONDS);
  const results = await pipeline.exec();

  const saddResult = results?.[0]?.[1] as number | undefined;
  return { isNew: saddResult === 1 };
}

export async function hasFingerprint(eventId: string, fingerprint: string): Promise<boolean> {
  const result = await redis.sismember(RedisKeys.fingerprintSet(eventId), fingerprint);
  return result === 1;
}

// ─────────────────────────────────────────────────────────────
// 4. Real-time leaderboard — `event:{id}:leaderboard`
// ─────────────────────────────────────────────────────────────

/** Increment a participant's score on the live leaderboard sorted set. Returns the new score. */
export async function incrementLeaderboardScore(
  eventId: string,
  participantId: string,
  amount = 1
): Promise<string> {
  return redis.zincrby(RedisKeys.leaderboard(eventId), amount, participantId);
}

export interface LeaderboardEntry {
  participantId: string;
  score: number;
  rank: number;
}

/** Top N participants for an event, highest score first. */
export async function getLeaderboard(eventId: string, limit = 20): Promise<LeaderboardEntry[]> {
  const raw = await redis.zrevrange(RedisKeys.leaderboard(eventId), 0, limit - 1, "WITHSCORES");
  const entries: LeaderboardEntry[] = [];
  for (let i = 0; i < raw.length; i += 2) {
    entries.push({
      participantId: raw[i]!,
      score: Number(raw[i + 1]),
      rank: i / 2 + 1,
    });
  }
  return entries;
}

/** A single participant's current rank (1-indexed) and score, or null if they have no score yet. */
export async function getParticipantRank(
  eventId: string,
  participantId: string
): Promise<{ rank: number; score: number } | null> {
  const [rank, score] = await Promise.all([
    redis.zrevrank(RedisKeys.leaderboard(eventId), participantId),
    redis.zscore(RedisKeys.leaderboard(eventId), participantId),
  ]);
  if (rank === null || score === null) return null;
  return { rank: rank + 1, score: Number(score) };
}

// ─────────────────────────────────────────────────────────────
// Click-log queue — `queue:click_logs`
// ─────────────────────────────────────────────────────────────

/**
 * Pushes a click event onto the durable Redis list queue. This is the
 * only Redis write the redirect hot path needs to make for logging —
 * an O(1) RPUSH — everything else (Postgres insert, geo enrichment
 * beyond what's already resolved, etc.) happens later in the worker.
 */
export async function enqueueClickLog(item: ClickLogQueueItem): Promise<void> {
  await redis.rpush(RedisKeys.clickLogQueue, JSON.stringify(item));
}

/**
 * Pops up to `count` items from the queue in one round trip using a
 * pipelined LPOP-with-count (Redis 6.2+). Used by the batch worker;
 * not used on the request path.
 */
export async function dequeueClickLogs(count: number): Promise<ClickLogQueueItem[]> {
  const raw = await redis.lpop(RedisKeys.clickLogQueue, count);
  if (!raw) return [];
  return raw.map((item) => JSON.parse(item) as ClickLogQueueItem);
}

export async function getClickLogQueueLength(): Promise<number> {
  return redis.llen(RedisKeys.clickLogQueue);
}
