import type { FastifyInstance } from "fastify";
import { prisma } from "@st-anthonys/database";
import { DEFAULT_TARIFF_LKR_PER_KWH } from "@st-anthonys/shared";
import type { OfflineSyncPayload } from "@st-anthonys/shared";

export async function internalRoutes(app: FastifyInstance) {
  app.post("/internal/offline-sync", async (req, reply) => {
    const payload = req.body as OfflineSyncPayload;

    const existing = await prisma.session.findUnique({
      where: { offlineSessionId: payload.offlineSessionId },
    });
    if (existing) {
      return { sessionId: existing.id, synced: true, duplicate: true };
    }

    const cp = await prisma.chargePoint.findUnique({
      where: { ocppId: payload.chargePointOcppId },
      include: { connectors: true },
    });
    if (!cp) return reply.status(404).send({ error: "Charge point not found" });

    const connector = cp.connectors.find((c) => c.connectorNum === payload.connectorId);
    if (!connector) return reply.status(404).send({ error: "Connector not found" });

    const user = await prisma.user.findFirst({
      where: { email: payload.idTag.replace("TAG-", "") },
    });
    if (!user) return reply.status(404).send({ error: "User not found for idTag" });

    const lastMeter = payload.meterValues[payload.meterValues.length - 1];
    const energyKwh = lastMeter?.energyKwh ?? 0;
    const costLkr = energyKwh * DEFAULT_TARIFF_LKR_PER_KWH;

    const session = await prisma.session.create({
      data: {
        userId: user.id,
        connectorId: connector.id,
        status: "completed",
        idTag: payload.idTag,
        startedAt: new Date(payload.startedAt),
        stoppedAt: new Date(payload.stoppedAt),
        energyKwh,
        costLkr,
        syncedFromOffline: true,
        offlineSessionId: payload.offlineSessionId,
        meterValues: {
          create: payload.meterValues.map((mv) => ({
            timestamp: new Date(mv.timestamp),
            powerKw: mv.powerKw,
            energyKwh: mv.energyKwh,
            socPercent: mv.socPercent,
            batteryTempC: mv.batteryTempC,
          })),
        },
        transaction: {
          create: {
            amountLkr: costLkr,
            tariff: DEFAULT_TARIFF_LKR_PER_KWH,
            receipt: {
              sessionId: payload.offlineSessionId,
              energyKwh,
              costLkr,
              tariff: DEFAULT_TARIFF_LKR_PER_KWH,
              paidAt: payload.stoppedAt,
              paymentMethod: "Offline sync — mock payment",
              status: "paid",
              note: "Synced from offline buffer",
            },
          },
        },
      },
    });

    await prisma.offlineQueue.upsert({
      where: { offlineSessionId: payload.offlineSessionId },
      create: { offlineSessionId: payload.offlineSessionId, payload, synced: true },
      update: { synced: true },
    });

    return { sessionId: session.id, synced: true };
  });
}
