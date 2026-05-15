import type { FastifyInstance } from "fastify";
import { prisma } from "@st-anthonys/database";
import { DEFAULT_TARIFF_LKR_PER_KWH } from "@st-anthonys/shared";

export async function siteRoutes(app: FastifyInstance) {
  app.get("/sites", async () => {
    const sites = await prisma.site.findMany({
      include: {
        hub: true,
        chargePoints: { include: { connectors: true } },
      },
    });
    return sites.map((s) => ({
      id: s.id,
      name: s.name,
      city: s.city,
      address: s.address,
      latitude: s.latitude,
      longitude: s.longitude,
      hubMaxKw: s.hub?.maxHubKw,
      tariffLkrPerKwh: DEFAULT_TARIFF_LKR_PER_KWH,
      chargePoints: s.chargePoints.map((cp) => ({
        id: cp.id,
        ocppId: cp.ocppId,
        model: cp.model,
        maxKw: cp.maxKw,
        status: cp.status,
        lastHeartbeat: cp.lastHeartbeat,
        connectors: cp.connectors.map((c) => ({
          id: c.id,
          connectorNum: c.connectorNum,
          status: c.status,
          qrUrl: `${process.env.DRIVER_WEB_URL ?? "http://localhost:3000"}/charge/${c.id}`,
        })),
      })),
    }));
  });

  app.get("/connectors/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const connector = await prisma.connector.findUnique({
      where: { id },
      include: {
        chargePoint: { include: { site: { include: { hub: true } } } },
      },
    });
    if (!connector) return reply.status(404).send({ error: "Connector not found" });
    return {
      id: connector.id,
      connectorNum: connector.connectorNum,
      status: connector.status,
      chargePoint: {
        id: connector.chargePoint.id,
        ocppId: connector.chargePoint.ocppId,
        model: connector.chargePoint.model,
        maxKw: connector.chargePoint.maxKw,
        status: connector.chargePoint.status,
      },
      site: connector.chargePoint.site,
      tariffLkrPerKwh: DEFAULT_TARIFF_LKR_PER_KWH,
    };
  });
}
