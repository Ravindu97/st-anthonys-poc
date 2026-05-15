import type { FastifyInstance } from "fastify";
import { prisma } from "@st-anthonys/database";
import { DEFAULT_TARIFF_LKR_PER_KWH } from "@st-anthonys/shared";
import { requireAdmin } from "../auth.js";
import { resetChargePoint } from "../ocpp-client.js";

export async function adminRoutes(app: FastifyInstance) {
  app.addHook("preHandler", async (req) => {
    await requireAdmin(req);
  });

  app.get("/admin/overview", async () => {
    const [chargePoints, activeSessions, completedToday] = await Promise.all([
      prisma.chargePoint.findMany({ include: { site: true, connectors: true } }),
      prisma.session.count({ where: { status: "active" } }),
      prisma.session.findMany({
        where: {
          status: "completed",
          stoppedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
    ]);

    const online = chargePoints.filter((cp) => cp.status !== "Offline").length;
    const todayKwh = completedToday.reduce((sum, s) => sum + s.energyKwh, 0);
    const todayRevenue = todayKwh * DEFAULT_TARIFF_LKR_PER_KWH;

    return {
      totalChargePoints: chargePoints.length,
      onlineChargePoints: online,
      offlineChargePoints: chargePoints.length - online,
      activeSessions,
      todayKwh: Math.round(todayKwh * 100) / 100,
      todayRevenueLkr: Math.round(todayRevenue),
      faultedChargePoints: chargePoints.filter((cp) => cp.status === "Faulted").length,
    };
  });

  app.get("/admin/charge-points", async () => {
    return prisma.chargePoint.findMany({
      include: { site: true, connectors: true },
      orderBy: { ocppId: "asc" },
    });
  });

  app.get("/admin/sessions", async () => {
    return prisma.session.findMany({
      include: {
        user: { select: { email: true, name: true } },
        connector: { include: { chargePoint: { include: { site: true } } } },
        transaction: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  });

  app.get("/admin/hubs", async () => {
    const hubs = await prisma.hub.findMany({
      include: {
        site: {
          include: {
            chargePoints: {
              include: {
                connectors: {
                  include: { sessions: { where: { status: "active" } } },
                },
              },
            },
          },
        },
      },
    });

    return hubs.map((hub) => {
      const activeSessions = hub.site.chargePoints.flatMap((cp) =>
        cp.connectors.flatMap((c) => c.sessions)
      );
      const allocatedKw = activeSessions.reduce((sum, s) => sum + (s.allocatedKw ?? 0), 0);
      return {
        id: hub.id,
        name: hub.name,
        siteName: hub.site.name,
        city: hub.site.city,
        maxHubKw: hub.maxHubKw,
        allocatedKw,
        utilizationPercent: Math.round((allocatedKw / hub.maxHubKw) * 100),
        activeSessions: activeSessions.length,
      };
    });
  });

  app.post("/admin/charge-points/:ocppId/reset", async (req) => {
    const { ocppId } = req.params as { ocppId: string };
    const { type } = (req.body as { type?: "Hard" | "Soft" }) ?? {};
    const success = await resetChargePoint(ocppId, type ?? "Soft");
    return { success };
  });
}
