import { Redis, type RedisOptions } from "ioredis";

export function createRedisClient(url?: string, forPubSub = false): Redis {
  const redisUrl = url ?? process.env.REDIS_URL ?? "redis://127.0.0.1:6379";
  const options: RedisOptions = {
    maxRetriesPerRequest: forPubSub ? null : 3,
    retryStrategy: (times: number) => Math.min(times * 200, 3000),
    enableReadyCheck: true,
    connectTimeout: 10_000,
  };

  const client = new Redis(redisUrl, options);
  client.on("error", () => {});
  return client;
}

/** Wait until Redis accepts PING (safe after Docker startup). */
export async function waitForRedis(client: Redis, label = "Redis"): Promise<void> {
  for (let attempt = 0; attempt < 20; attempt++) {
    try {
      const pong = await client.ping();
      if (pong === "PONG") {
        console.log(`[redis] ${label} connected`);
        return;
      }
    } catch {
      // still starting
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`${label} not available — is Docker Redis running on port 6379?`);
}
