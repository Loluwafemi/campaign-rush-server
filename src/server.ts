import { buildApp } from "@/app";
import { env } from "@/config/env";
import { logger } from "@/lib/logger";
import { closePrisma } from "@/lib/prisma";
import { closeRedis } from "@/lib/redis";

async function main(): Promise<void> {
  const app = await buildApp();

  try {
    await app.listen({ port: env.PORT, host: env.HOST });
    logger.info(`🚀 Referral API listening on ${env.HOST}:${env.PORT}`);
  } catch (err) {
    logger.error({ err }, "Failed to start server");
    process.exit(1);
  }

  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, "Graceful shutdown initiated");
    try {
      await app.close();
      await Promise.all([closeRedis(), closePrisma()]);
      logger.info("Shutdown complete");
      process.exit(0);
    } catch (err) {
      logger.error({ err }, "Error during shutdown");
      process.exit(1);
    }
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

void main();
