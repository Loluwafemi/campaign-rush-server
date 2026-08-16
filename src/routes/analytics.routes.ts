import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { getEventAuditLog, getEventClickLogs, getEventDashboard } from "@/controllers/analytics.controller";

/** Same host-auth guard as Phase 2's event routes — verifies the JWT and populates `request.user`. */
async function requireHostAuth(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    await req.jwtVerify();
  } catch {
    await reply.code(401).send({ error: "Unauthorized", message: "Missing or invalid host token" });
  }
}

export async function analyticsRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("preHandler", requireHostAuth);

  app.get("/host/events/:id/dashboard", getEventDashboard);
  app.get("/host/events/:id/logs", getEventClickLogs);
  app.get("/host/events/:id/audit", getEventAuditLog);
}
