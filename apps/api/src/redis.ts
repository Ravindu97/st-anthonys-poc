import { createRedisClient, waitForRedis, REDIS_CHANNELS } from "@st-anthonys/shared";

const redisUrl = process.env.REDIS_URL ?? "redis://127.0.0.1:6379";
export const redis = createRedisClient(redisUrl);
export const redisSub = createRedisClient(redisUrl, true);

export { REDIS_CHANNELS };

export async function connectRedis(): Promise<void> {
  await waitForRedis(redis, "Redis (API)");
  await waitForRedis(redisSub, "Redis subscriber (API)");
}
