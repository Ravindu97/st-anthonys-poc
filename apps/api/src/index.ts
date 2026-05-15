import Fastify from "fastify";
import cors from "@fastify/cors";
import { authRoutes } from "./routes/auth.js";
import { siteRoutes } from "./routes/sites.js";
import { sessionRoutes } from "./routes/sessions.js";
import { adminRoutes } from "./routes/admin.js";
import { internalRoutes } from "./routes/internal.js";
import { sseRoutes } from "./routes/sse.js";
import { connectRedis } from "./redis.js";
import { waitForDatabase } from "./db.js";

const PORT = Number(process.env.API_PORT ?? 3001);

async function main() {
  const app = Fastify({ logger: true });

  app.setErrorHandler((err, _req, reply) => {
    if (err.name === "PrismaClientInitializationError") {
      return reply.status(503).send({
        error: "Database unavailable. Run: ./scripts/ensure-db.sh  (Docker must be running)",
      });
    }
    if (err.name === "ZodError") {
      return reply.status(400).send({ error: "Invalid request" });
    }
    app.log.error(err);
    return reply.status(500).send({ error: err.message || "Internal Server Error" });
  });

  await app.register(cors, { origin: true });

  await app.register(authRoutes);
  await app.register(siteRoutes);
  await app.register(sessionRoutes);
  await app.register(adminRoutes);
  await app.register(internalRoutes);
  await app.register(sseRoutes);

  app.get("/", async () => ({
    service: "cms-api",
    health: "/health",
    docs: "See docs/LOCAL_DEVELOPMENT.md",
  }));

  app.get("/health", async () => {
    try {
      const { prisma } = await import("@st-anthonys/database");
      await prisma.$queryRaw`SELECT 1`;
      return { status: "ok", service: "cms-api", database: "connected" };
    } catch {
      return { status: "degraded", service: "cms-api", database: "unavailable" };
    }
  });

  await app.listen({ port: PORT, host: "0.0.0.0" });
  console.log(`CMS API listening on http://localhost:${PORT}`);

  void waitForDatabase().catch((err) =>
    console.warn("[db]", (err as Error).message)
  );
  void connectRedis().catch((err) =>
    console.warn("[redis]", (err as Error).message)
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
