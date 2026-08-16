import Redis from "ioredis";
import { env } from "@/config/env";
import { createLogger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { getClickLogQueueLength, RedisKeys } from "@/lib/redis";
import type { ClickLogQueueItem } from "@/types";

const log = createLogger("click-log-worker");

/**
 * Isolated Redis connection for the worker. Kept separate from the
 * request-path `redis` client in src/lib/redis.ts so batch LPOPs and
 * any future blocking reads here never compete with the redirect
 * route's traffic.
 */
const workerRedis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: 2 });

workerRedis.on("connect", () => log.info("Worker Redis connection established"));
workerRedis.on("error", (err) => log.error({ err }, "Worker Redis connection error"));

/**
 * Pops up to `count` items off `queue:click_logs` via the worker's
 * own connection (Redis 6.2+ LPOP-with-count, one round trip). Kept
 * local to this file rather than routed through lib/redis.ts so the
 * worker never shares a socket with request-path traffic.
 */
async function dequeueClickLogsFromWorkerConnection(count: number): Promise<ClickLogQueueItem[]> {
  const raw = await workerRedis.lpop(RedisKeys.clickLogQueue, count);
  if (!raw) return [];
  return raw.map((entry) => JSON.parse(entry) as ClickLogQueueItem);
}

let isRunning = true;
let inFlight = false;

/**
 * Pulls up to CLICK_LOG_BATCH_SIZE items off `queue:click_logs` and
 * writes them to Postgres in a single batched insert, then bumps
 * each participant's durable score column for VALID clicks. Batching
 * keeps Postgres write volume proportional to worker throughput
 * rather than raw redirect QPS.
 */
async function flushBatch(): Promise<number> {
  const items = await dequeueClickLogsFromWorkerConnection(env.CLICK_LOG_BATCH_SIZE);
  if (items.length === 0) return 0;

  await prisma.clickLog.createMany({
    data: items.map((item) => toClickLogRow(item)),
  });

  const validByParticipant = new Map<string, number>();
  for (const item of items) {
    if (item.status !== "VALID") continue;
    validByParticipant.set(item.participantId, (validByParticipant.get(item.participantId) ?? 0) + 1);
  }

  if (validByParticipant.size > 0) {
    await prisma.$transaction(
      Array.from(validByParticipant.entries()).map(([participantId, increment]) =>
        prisma.participant.update({
          where: { id: participantId },
          data: { score: { increment } },
        })
      )
    );
  }

  log.info({ count: items.length, scoredParticipants: validByParticipant.size }, "Flushed click log batch");
  return items.length;
}

function toClickLogRow(item: ClickLogQueueItem) {
  return {
    eventId: item.eventId,
    participantId: item.participantId,
    ipHash: item.ipHash,
    userAgent: item.userAgent,
    referrer: item.referrer,
    country: item.country,
    status: item.status,
    clickedAt: new Date(item.clickedAt),
  };
}

/**
 * Main loop: drain the queue in batches until empty, then sleep for
 * CLICK_LOG_BATCH_INTERVAL_MS before checking again. Draining fully
 * on each wake-up (rather than popping one batch per tick) keeps the
 * queue from building an unbounded backlog during traffic spikes.
 */
async function runLoop(): Promise<void> {
  while (isRunning) {
    inFlight = true;
    try {
      let flushedInThisWakeup = 0;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const flushed = await flushBatch();
        flushedInThisWakeup += flushed;
        if (flushed < env.CLICK_LOG_BATCH_SIZE) break; // queue drained below a full batch
      }
      if (flushedInThisWakeup === 0) {
        log.debug("Queue empty, idling");
      }
    } catch (err) {
      log.error({ err }, "Error while flushing click log batch — will retry next tick");
    } finally {
      inFlight = false;
    }

    await sleep(env.CLICK_LOG_BATCH_INTERVAL_MS);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function reportBacklog(): Promise<void> {
  const depth = await getClickLogQueueLength();
  if (depth > env.CLICK_LOG_BATCH_SIZE * 10) {
    log.warn({ depth }, "Click log queue backlog is growing — worker may be falling behind");
  }
}

async function main(): Promise<void> {
  log.info(
    { batchSize: env.CLICK_LOG_BATCH_SIZE, intervalMs: env.CLICK_LOG_BATCH_INTERVAL_MS },
    "Click log worker starting"
  );

  const backlogInterval = setInterval(() => void reportBacklog(), 10_000);

  const shutdown = async (signal: string): Promise<void> => {
    log.info({ signal }, "Shutdown signal received, draining in-flight batch");
    isRunning = false;
    clearInterval(backlogInterval);

    // Give any in-flight flushBatch a moment to finish rather than
    // killing the process mid-write.
    const deadline = Date.now() + 5000;
    while (inFlight && Date.now() < deadline) {
      await sleep(100);
    }

    await prisma.$disconnect();
    await workerRedis.quit();
    log.info("Click log worker stopped");
    process.exit(0);
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));

  await runLoop();
}

void main();
