import type { FastifyInstance } from "fastify";
import { loginHost, registerHost } from "@/controllers/auth.controller";

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post("/auth/register", registerHost);
  app.post("/auth/login", loginHost);
}
