import type { FastifyInstance } from "fastify";
import { redisSub, REDIS_CHANNELS } from "../redis.js";

export async function sseRoutes(app: FastifyInstance) {
  app.get("/events", async (req, reply) => {
    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    const channels = Object.values(REDIS_CHANNELS);
    await redisSub.subscribe(...channels);

    const handler = (channel: string, message: string) => {
      reply.raw.write(`event: ${channel}\ndata: ${message}\n\n`);
    };

    redisSub.on("message", handler);

    const keepAlive = setInterval(() => {
      reply.raw.write(": keepalive\n\n");
    }, 15_000);

    req.raw.on("close", () => {
      clearInterval(keepAlive);
      redisSub.off("message", handler);
      void redisSub.unsubscribe(...channels);
    });
  });
}
