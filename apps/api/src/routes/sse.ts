import type { FastifyInstance, FastifyRequest } from "fastify";
import { redisSub, REDIS_CHANNELS } from "../redis.js";

function corsHeaders(req: FastifyRequest): Record<string, string> {
  const origin = req.headers.origin;
  if (origin) {
    return {
      "Access-Control-Allow-Origin": origin,
      Vary: "Origin",
    };
  }
  return { "Access-Control-Allow-Origin": "*" };
}

export async function sseRoutes(app: FastifyInstance) {
  app.options("/events", async (req, reply) => {
    reply
      .headers({
        ...corsHeaders(req),
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      })
      .status(204)
      .send();
  });

  app.get("/events", async (req, reply) => {
    reply.hijack();

    reply.raw.writeHead(200, {
      ...corsHeaders(req),
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
