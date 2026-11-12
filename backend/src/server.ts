import http from "http";
import app from "./app";
import { initWebSocket } from "./websocket/ws.server";
import { logger } from "./utils/logger";
import { env } from "./config/env";
import { connectDatabase, disconnectDatabase } from "./config/database";
import { redis } from "./config/redis";
import { startUnpaidOrdersJob, stopUnpaidOrdersJob } from "./jobs/unpaidOrders.job";

// This is the process entrypoint. app.ts only builds the Express app;
// everything that has a side effect on the outside world — opening a
// socket, connecting to MongoDB, starting the WebSocket server, binding a
// port — happens here instead, so `app.ts` stays safe to import from tests.

async function start() {
  // Connect to MongoDB BEFORE accepting any traffic. This was missing
  // entirely before — the server used to start listening with no database
  // connection at all, so every route would have failed on first query.
  await connectDatabase();

  const server = http.createServer(app);

  // ── WebSocket ────────────────────────────────────────────────────────────
  initWebSocket(server);

  server.listen(env.PORT, () => {
    logger.info(`🪔 nityasamagri API running on port ${env.PORT}`);
    logger.info(`📡 WebSocket server ready`);
    logger.info(`🌍 Environment: ${env.NODE_ENV}`);
  });

  // ── Background jobs ──────────────────────────────────────────────────────
  startUnpaidOrdersJob();

  // ── Graceful shutdown ────────────────────────────────────────────────────
  const shutdown = async (signal: string) => {
    logger.info(`${signal} received, shutting down gracefully...`);
    stopUnpaidOrdersJob();
    server.close(async () => {
      await disconnectDatabase();
      redis.disconnect();
      logger.info("Shutdown complete");
      process.exit(0);
    });
    // Force-exit if graceful shutdown hangs
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  return server;
}

const serverPromise = start().catch((err) => {
  logger.error("Failed to start server", { err });
  process.exit(1);
});

export default serverPromise;