import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { createEvent, getPublicEventSummary, listEventsForHost } from "@/controllers/event.controller";

/**
 * Verifies the host's JWT and populates `request.user`. Requires
 * @fastify/jwt to be registered on the app instance before these
 * routes (see src/app.ts); the payload shape is declared once in
 * src/types/index.ts.
 */
async function requireHostAuth(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    await req.jwtVerify();
  } catch {
    await reply.code(401).send({ error: "Unauthorized", message: "Missing or invalid host token" });
  }
}

export async function eventRoutes(app: FastifyInstance): Promise<void> {
  app.post("/events", { preHandler: requireHostAuth }, async (req, reply) => {
    await createEvent(req, reply);
  });

  // Lists the authenticated host's own events — backs the host
  // landing page's event list.
  app.get("/events", { preHandler: requireHostAuth }, listEventsForHost);

  // Public — no auth. Backs the participant-facing "join this event"
  // page, which needs the event's name/description/image before
  // anyone has registered (and therefore before anyone has a token).
  app.get("/events/:id/public", getPublicEventSummary);
}
