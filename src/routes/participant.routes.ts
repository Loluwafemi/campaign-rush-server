import type { FastifyInstance } from "fastify";
import { getMyParticipantStatus, registerParticipant } from "@/controllers/participant.controller";

export async function participantRoutes(app: FastifyInstance): Promise<void> {
  // Public — a participant registers themselves against a host's
  // event, no host-level auth required. Fastify's built-in rate
  // limiter (registered globally on the app) is the abuse guard here.
  app.post("/participants/register", async (req, reply) => {
    await registerParticipant(req, reply);
  });

  // Public route, but not unauthenticated — access is gated by the
  // participant's own bearer token (verified inside the handler),
  // not by a host session. Backs the /p/:refCode mini-dashboard.
  app.get("/participants/me", async (req, reply) => {
    await getMyParticipantStatus(req, reply);
  });
}
