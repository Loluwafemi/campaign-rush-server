import fp from "fastify-plugin";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { enqueueClickLog } from "@/lib/redis";
import { createLogger } from "@/lib/logger";
import type { ClickLogQueueItem } from "@/types";

const log = createLogger("click-logger");

/**
 * Route handlers that want a click recorded set this on the request
 * object (e.g. inside the redirect handler in a later phase) before
 * the response is sent. If it's never set, the onResponse hook is a
 * no-op for that request — this plugin is safe to register globally.
 */
declare module "fastify" {
  interface FastifyRequest {
    clickLogData?: ClickLogQueueItem;
  }
}

/**
 * Registers an `onResponse` hook, which Fastify guarantees runs
 * *after* the response has already been flushed to the socket. That
 * makes it the correct place for "log this click" work: the click
 * is never on the critical path to the redirect/response, and any
 * latency here (a Redis RPUSH, then a Pino write) cannot slow down
 * what the browser or WhatsApp crawler actually waits on.
 *
 * The hook itself does not await the enqueue before returning either
 * — it fires the promise and lets Fastify's lifecycle move on, with
 * errors caught and logged rather than surfaced to the client (whose
 * response has already gone out).
 */
export const clickLoggerPlugin = fp(
  async function clickLoggerPlugin(app: FastifyInstance) {
    app.addHook("onResponse", (request: FastifyRequest, reply: FastifyReply, done) => {
      const data = request.clickLogData;
      if (!data) {
        done();
        return;
      }

      enqueueClickLog(data)
        .then(() => {
          log.debug(
            { eventId: data.eventId, participantId: data.participantId, status: data.status },
            "Click event enqueued"
          );
        })
        .catch((err: unknown) => {
          log.error(
            { err, eventId: data.eventId, participantId: data.participantId },
            "Failed to enqueue click event — click will not be recorded"
          );
        });

      // Report the response cycle as complete immediately; the enqueue
      // above continues in the background and is not awaited here.
      done();
    });

    log.info("Click logger plugin registered");
  },
  { name: "click-logger-plugin" }
);
