import { prisma } from "@st-anthonys/database";
import { setChargingProfile } from "./ocpp-client.js";
import { redis, REDIS_CHANNELS } from "./redis.js";

export async function rebalanceHub(siteId: string) {
  const site = await prisma.site.findUnique({
    where: { id: siteId },
    include: {
      hub: true,
      chargePoints: {
        include: {
          connectors: {
            include: {
              sessions: {
                where: { status: "active" },
              },
            },
          },
        },
      },
    },
  });

  if (!site?.hub) return;

  const activeSessions = site.chargePoints.flatMap((cp) =>
    cp.connectors.flatMap((conn) =>
      conn.sessions.map((s) => ({
        sessionId: s.id,
        chargePointOcppId: cp.ocppId,
        connectorNum: conn.connectorNum,
        maxKw: cp.maxKw,
      }))
    )
  );

  if (activeSessions.length === 0) return;

  const perSessionKw = site.hub.maxHubKw / activeSessions.length;

  for (const sess of activeSessions) {
    const allocatedKw = Math.min(perSessionKw, sess.maxKw);
    await prisma.session.update({
      where: { id: sess.sessionId },
      data: { allocatedKw },
    });
    await setChargingProfile(sess.chargePointOcppId, sess.connectorNum, allocatedKw);
  }

  await redis.publish(
    REDIS_CHANNELS.HUB_LOAD_UPDATE,
    JSON.stringify({
      hubId: site.hub.id,
      siteName: site.name,
      maxHubKw: site.hub.maxHubKw,
      allocatedKw: perSessionKw * activeSessions.length,
      activeSessions: activeSessions.length,
    })
  );
}
