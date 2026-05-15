import Fastify from "fastify";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import { setupOcppWebSocket } from "./ocpp-server.js";
import { internalRoutes } from "./internal-routes.js";
import { connectRedis } from "./redis.js";
import { prisma } from "@st-anthonys/database";

const PORT = Number(process.env.OCPP_GATEWAY_PORT ?? 3002);

async function waitForDatabase() {
  for (let i = 0; i < 60; i++) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      console.log("[db] Connected to PostgreSQL");
      return;
    } catch {
      if (i % 5 === 0) console.log("[db] Waiting for PostgreSQL...");
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  console.warn("[db] PostgreSQL not ready — OCPP will retry DB operations");
}

async function main() {
  const app = Fastify({ logger: true });
  await app.register(internalRoutes);

  const server = createServer(app.server);
  const wss = new WebSocketServer({ server });
  setupOcppWebSocket(wss);

  await new Promise<void>((resolve, reject) => {
    server.listen(PORT, "0.0.0.0", () => {
      console.log(`OCPP gateway listening on http://localhost:${PORT} (ws path /ocpp/{chargePointId})`);
      resolve();
    });
    server.on("error", reject);
  });

  void waitForDatabase();
  void connectRedis().catch((err) =>
    console.warn("[redis] Will retry on publish:", (err as Error).message)
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
