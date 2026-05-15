import type { FastifyInstance } from "fastify";
import { prisma } from "@st-anthonys/database";
import {
  DEFAULT_TARIFF_LKR_PER_KWH,
  type AdminFleetSnapshot,
  type AdminHubSummary,
  type AdminOverview,
  type AdminTrendsResponse,
  type PaginatedResponse,
} from "@st-anthonys/shared";
import { requireAdmin } from "../auth.js";
import { resetChargePoint } from "../ocpp-client.js";
import {
  buildChargePointsOrderBy,
  buildChargePointsWhere,
  buildSessionsOrderBy,
  buildSessionsWhere,
  endOfDay,
  escapeCsvField,
  parseChargePointsQuery,
  parseDateRangeQuery,
  parseHubsQuery,
  parseSessionsQuery,
  parseTrendsQuery,
  resolveDateRange,
  startOfDay,
} from "../lib/admin-query.js";

const sessionInclude = {
  user: { select: { email: true, name: true } },
  connector: { include: { chargePoint: { include: { site: true } } } },
  transaction: true,
};

export async function adminRoutes(app: FastifyInstance) {
  app.addHook("preHandler", async (req) => {
    await requireAdmin(req);
  });

  app.get("/admin/overview", async (req) => {
    const { from: fromStr, to: toStr } = parseDateRangeQuery(
      req.query as Record<string, unknown>
    );
    const { from, to } = resolveDateRange(fromStr, toStr);

    const [chargePoints, activeSessions, completedInRange] = await Promise.all([
      prisma.chargePoint.findMany({ include: { site: true, connectors: true } }),
      prisma.session.count({ where: { status: "active" } }),
      prisma.session.findMany({
        where: {
          status: "completed",
          stoppedAt: { gte: from, lte: to },
        },
      }),
    ]);

    const online = chargePoints.filter((cp) => cp.status !== "Offline").length;
    const totalKwh = completedInRange.reduce((sum, s) => sum + s.energyKwh, 0);
    const totalRevenue = completedInRange.reduce(
      (sum, s) => sum + (s.costLkr > 0 ? s.costLkr : s.energyKwh * DEFAULT_TARIFF_LKR_PER_KWH),
      0
    );

    const overview: AdminOverview = {
      totalChargePoints: chargePoints.length,
      onlineChargePoints: online,
      offlineChargePoints: chargePoints.length - online,
      activeSessions,
      totalKwh: Math.round(totalKwh * 100) / 100,
      totalRevenueLkr: Math.round(totalRevenue),
      faultedChargePoints: chargePoints.filter((cp) => cp.status === "Faulted").length,
      completedSessions: completedInRange.length,
      from: from.toISOString(),
      to: to.toISOString(),
    };
    return overview;
  });

  app.get("/admin/sites", async () => {
    return prisma.site.findMany({
      select: { id: true, name: true, city: true },
      orderBy: { city: "asc" },
    });
  });

  app.get("/admin/sessions", async (req) => {
    const query = parseSessionsQuery(req.query as Record<string, unknown>);
    const where = buildSessionsWhere(query);
    const skip = (query.page - 1) * query.pageSize;

    const [items, total] = await Promise.all([
      prisma.session.findMany({
        where,
        include: sessionInclude,
        orderBy: buildSessionsOrderBy(query),
        skip,
        take: query.pageSize,
      }),
      prisma.session.count({ where }),
    ]);

    const response: PaginatedResponse<(typeof items)[number]> = {
      items,
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
    return response;
  });

  app.get("/admin/sessions/export", async (req, reply) => {
    const query = parseSessionsQuery(req.query as Record<string, unknown>);
    const where = buildSessionsWhere(query);

    const sessions = await prisma.session.findMany({
      where,
      include: sessionInclude,
      orderBy: buildSessionsOrderBy(query),
    });

    const headers = [
      "ID",
      "User",
      "Email",
      "Site",
      "City",
      "ChargePoint",
      "Connector",
      "Status",
      "kWh",
      "LKR",
      "Started",
      "Stopped",
      "Offline Sync",
    ];
    const rows = sessions.map((s) =>
      [
        s.id,
        s.user.name,
        s.user.email,
        s.connector.chargePoint.site.name,
        s.connector.chargePoint.site.city,
        s.connector.chargePoint.ocppId,
        s.connector.connectorNum,
        s.status,
        s.energyKwh,
        s.costLkr,
        s.startedAt?.toISOString() ?? "",
        s.stoppedAt?.toISOString() ?? "",
        s.syncedFromOffline,
      ]
        .map(escapeCsvField)
        .join(",")
    );

    const csv = [headers.join(","), ...rows].join("\n");
    reply.header("Content-Type", "text/csv; charset=utf-8");
    reply.header("Content-Disposition", 'attachment; filename="sessions.csv"');
    return csv;
  });

  app.get("/admin/charge-points", async (req) => {
    const query = parseChargePointsQuery(req.query as Record<string, unknown>);
    const where = buildChargePointsWhere(query);
    const skip = (query.page - 1) * query.pageSize;

    const [items, total] = await Promise.all([
      prisma.chargePoint.findMany({
        where,
        include: { site: true, connectors: true },
        orderBy: buildChargePointsOrderBy(query),
        skip,
        take: query.pageSize,
      }),
      prisma.chargePoint.count({ where }),
    ]);

    const response: PaginatedResponse<(typeof items)[number]> = {
      items,
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
    return response;
  });

  app.get("/admin/hubs", async (req) => {
    const query = parseHubsQuery(req.query as Record<string, unknown>);

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

    let summaries: AdminHubSummary[] = hubs.map((hub) => {
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

    if (query.city) {
      summaries = summaries.filter(
        (h) => h.city.toLowerCase() === query.city!.toLowerCase()
      );
    }
    if (query.minUtilization !== undefined) {
      summaries = summaries.filter((h) => h.utilizationPercent >= query.minUtilization!);
    }

    const dir = query.sortOrder === "asc" ? 1 : -1;
    summaries.sort((a, b) => {
      let cmp = 0;
      switch (query.sortBy) {
        case "allocatedKw":
          cmp = a.allocatedKw - b.allocatedKw;
          break;
        case "siteName":
          cmp = a.siteName.localeCompare(b.siteName);
          break;
        default:
          cmp = a.utilizationPercent - b.utilizationPercent;
      }
      return cmp * dir;
    });

    return summaries;
  });

  app.get("/admin/analytics/trends", async (req) => {
    const query = parseTrendsQuery(req.query as Record<string, unknown>);
    const { from, to } = resolveDateRange(query.from, query.to);

    const sessions = await prisma.session.findMany({
      where: {
        createdAt: { gte: from, lte: to },
      },
      select: {
        status: true,
        energyKwh: true,
        costLkr: true,
        createdAt: true,
      },
    });

    const bucketMap = new Map<
      string,
      { sessionCount: number; completedCount: number; totalKwh: number; totalRevenueLkr: number }
    >();

    for (const s of sessions) {
      const key = s.createdAt.toISOString().slice(0, 10);
      const bucket = bucketMap.get(key) ?? {
        sessionCount: 0,
        completedCount: 0,
        totalKwh: 0,
        totalRevenueLkr: 0,
      };
      bucket.sessionCount += 1;
      if (s.status === "completed") {
        bucket.completedCount += 1;
        bucket.totalKwh += s.energyKwh;
        bucket.totalRevenueLkr +=
          s.costLkr > 0 ? s.costLkr : s.energyKwh * DEFAULT_TARIFF_LKR_PER_KWH;
      }
      bucketMap.set(key, bucket);
    }

    const buckets = Array.from(bucketMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, b]) => ({
        date,
        sessionCount: b.sessionCount,
        completedCount: b.completedCount,
        totalKwh: Math.round(b.totalKwh * 100) / 100,
        totalRevenueLkr: Math.round(b.totalRevenueLkr),
      }));

    const response: AdminTrendsResponse = {
      buckets,
      from: from.toISOString(),
      to: to.toISOString(),
    };
    return response;
  });

  app.get("/admin/analytics/fleet", async (req) => {
    const { from: fromStr, to: toStr } = parseDateRangeQuery(
      req.query as Record<string, unknown>
    );
    const { from, to } = resolveDateRange(fromStr, toStr);

    const [chargePoints, connectors, offlineSyncSessions, failedSessions] =
      await Promise.all([
        prisma.chargePoint.findMany({ include: { site: true } }),
        prisma.connector.findMany(),
        prisma.session.count({
          where: {
            syncedFromOffline: true,
            createdAt: { gte: from, lte: to },
          },
        }),
        prisma.session.count({
          where: {
            status: "failed",
            createdAt: { gte: from, lte: to },
          },
        }),
      ]);

    const cityMap = new Map<
      string,
      {
        available: number;
        charging: number;
        faulted: number;
        offline: number;
        unavailable: number;
      }
    >();

    for (const cp of chargePoints) {
      const city = cp.site.city;
      const entry = cityMap.get(city) ?? {
        available: 0,
        charging: 0,
        faulted: 0,
        offline: 0,
        unavailable: 0,
      };
      switch (cp.status) {
        case "Available":
          entry.available += 1;
          break;
        case "Charging":
          entry.charging += 1;
          break;
        case "Faulted":
          entry.faulted += 1;
          break;
        case "Offline":
          entry.offline += 1;
          break;
        case "Unavailable":
          entry.unavailable += 1;
          break;
      }
      cityMap.set(city, entry);
    }

    const snapshot: AdminFleetSnapshot = {
      chargePointsByCity: Array.from(cityMap.entries()).map(([city, counts]) => ({
        city,
        ...counts,
      })),
      connectorOccupied: connectors.filter((c) => c.status === "Occupied").length,
      connectorAvailable: connectors.filter((c) => c.status === "Available").length,
      connectorFaulted: connectors.filter((c) => c.status === "Faulted").length,
      offlineSyncSessions,
      failedSessions,
      from: from.toISOString(),
      to: to.toISOString(),
    };
    return snapshot;
  });

  app.post("/admin/charge-points/:ocppId/reset", async (req) => {
    const { ocppId } = req.params as { ocppId: string };
    const { type } = (req.body as { type?: "Hard" | "Soft" }) ?? {};
    const success = await resetChargePoint(ocppId, type ?? "Soft");
    return { success };
  });
}
