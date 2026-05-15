import { createRedisClient, waitForRedis, REDIS_CHANNELS } from "@st-anthonys/shared";

export const redis = createRedisClient(process.env.REDIS_URL);

export async function connectRedis(): Promise<void> {
  await waitForRedis(redis, "Redis (OCPP gateway)");
}

export async function publishSessionUpdate(payload: Record<string, unknown>) {
  try {
    await redis.publish(REDIS_CHANNELS.SESSION_UPDATE, JSON.stringify(payload));
  } catch (err) {
    console.error("[redis] publish session:", (err as Error).message);
  }
}

export async function publishChargePointUpdate(payload: Record<string, unknown>) {
  try {
    await redis.publish(REDIS_CHANNELS.CHARGE_POINT_UPDATE, JSON.stringify(payload));
  } catch (err) {
    console.error("[redis] publish chargepoint:", (err as Error).message);
  }
}

export async function publishHubLoadUpdate(payload: Record<string, unknown>) {
  try {
    await redis.publish(REDIS_CHANNELS.HUB_LOAD_UPDATE, JSON.stringify(payload));
  } catch (err) {
    console.error("[redis] publish hub:", (err as Error).message);
  }
}
