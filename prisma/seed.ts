import { PrismaClient } from "@prisma/client";
import { randomBytes, scryptSync } from "node:crypto";

const prisma = new PrismaClient();

const SCRYPT_KEYLEN = 64;

/**
 * Self-contained scrypt hashing, matching the shape expected by
 * `Host.passwordHash` (salt:hash, both hex). Kept local to the seed
 * script rather than imported from an app module, since no host
 * registration/login controller exists yet in this project — the
 * seed script needs to be runnable independent of that.
 */
function hashPassword(plain: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(plain, salt, SCRYPT_KEYLEN).toString("hex");
  return `${salt}:${derived}`;
}

async function main() {
  const email = "demo@referralapp.dev";

  const existingHost = await prisma.host.findUnique({ where: { email } });
  if (existingHost) {
    console.log("Seed skipped — demo host already exists:", email);
    return;
  }

  const host = await prisma.host.create({
    data: {
      email,
      passwordHash: hashPassword("demo-password-123"),
    },
  });

  const durationHours = 72;
  const expiresAt = new Date(Date.now() + durationHours * 60 * 60 * 1000);

  const event = await prisma.event.create({
    data: {
      hostId: host.id,
      name: "WhatsApp Group Growth — Launch Week",
      description: "Join our community before the timer runs out.",
      ogImageUrl: "https://placehold.co/1200x630/121821/3DDC97?text=Join+the+Group",
      targetGroupUrl: "https://chat.whatsapp.com/example-invite-code",
      durationHours,
      expiresAt,
      status: "ACTIVE",
    },
  });

  await prisma.eventAuditLog.create({
    data: {
      eventId: event.id,
      actionType: "EVENT_CREATED",
      metadata: { hostId: host.id, durationHours, seeded: true },
    },
  });

  const participants = await Promise.all(
    [
      { name: "Priya S.", phoneNumber: "+919812345601", refCode: "PRIYA01" },
      { name: "Arjun K.", phoneNumber: "+919812345602", refCode: "ARJUN02" },
      { name: "Meera R.", phoneNumber: "+919812345603", refCode: "MEERA03" },
    ].map((p) =>
      prisma.participant.create({
        data: {
          eventId: event.id,
          name: p.name,
          phoneNumber: p.phoneNumber,
          refCode: p.refCode,
          score: 0,
        },
      })
    )
  );

  console.log("Seeded demo host:", email, "(password: demo-password-123)");
  console.log("Seeded event:", event.id, "-", event.name);
  console.log(
    "Seeded participants:",
    participants.map((p) => `${p.name} (${p.refCode})`).join(", ")
  );
  console.log("\nTry a redirect once the API is running:");
  console.log(`  http://localhost:3001/chat/${participants[0]!.refCode}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
