import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createLogger } from "@/lib/logger";

const log = createLogger("auth-controller");

const SCRYPT_KEYLEN = 64;

function hashPassword(plain: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(plain, salt, SCRYPT_KEYLEN).toString("hex");
  return `${salt}:${derived}`;
}

function verifyPassword(plain: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const derived = scryptSync(plain, salt, SCRYPT_KEYLEN);
  const storedBuf = Buffer.from(hash, "hex");
  if (derived.length !== storedBuf.length) return false;
  return timingSafeEqual(derived, storedBuf);
}

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/**
 * POST /api/v1/auth/register
 * Creates a Host and immediately signs a JWT for them — matches the
 * pattern every other host-protected route (`requireHostAuth`)
 * already expects: a bearer token carrying {hostId, email}.
 */
export async function registerHost(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const input = registerSchema.parse(req.body);

  const existing = await prisma.host.findUnique({ where: { email: input.email } });
  if (existing) {
    return reply.code(409).send({ error: "Conflict", message: "Email already registered" });
  }

  const host = await prisma.host.create({
    data: { email: input.email, passwordHash: hashPassword(input.password) },
  });

  const token = await reply.jwtSign({ hostId: host.id, email: host.email });

  log.info({ hostId: host.id }, "Host registered");

  await reply.code(201).send({ token, host: { id: host.id, email: host.email } });
}

/**
 * POST /api/v1/auth/login
 */
export async function loginHost(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const input = loginSchema.parse(req.body);

  const host = await prisma.host.findUnique({ where: { email: input.email } });
  if (!host || !verifyPassword(input.password, host.passwordHash)) {
    return reply.code(401).send({ error: "Unauthorized", message: "Invalid email or password" });
  }

  const token = await reply.jwtSign({ hostId: host.id, email: host.email });

  await reply.send({ token, host: { id: host.id, email: host.email } });
}
