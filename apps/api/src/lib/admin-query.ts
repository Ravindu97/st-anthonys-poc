import {
  AdminChargePointsQuerySchema,
  AdminDateRangeQuerySchema,
  AdminHubsQuerySchema,
  AdminSessionsQuerySchema,
  AdminTrendsQuerySchema,
  HEARTBEAT_TIMEOUT_MS,
  type AdminChargePointsQuery,
  type AdminDateRangeQuery,
  type AdminHubsQuery,
  type AdminSessionsQuery,
  type AdminTrendsQuery,
} from "@st-anthonys/shared";

export function parseSessionsQuery(q: Record<string, unknown>): AdminSessionsQuery {
  return AdminSessionsQuerySchema.parse(q);
}

export function parseChargePointsQuery(q: Record<string, unknown>): AdminChargePointsQuery {
  return AdminChargePointsQuerySchema.parse(q);
}

export function parseHubsQuery(q: Record<string, unknown>): AdminHubsQuery {
  return AdminHubsQuerySchema.parse(q);
}

export function parseDateRangeQuery(q: Record<string, unknown>): AdminDateRangeQuery {
  return AdminDateRangeQuerySchema.parse(q);
}

export function parseTrendsQuery(q: Record<string, unknown>): AdminTrendsQuery {
  return AdminTrendsQuerySchema.parse(q);
}

export function resolveDateRange(from?: string, to?: string): { from: Date; to: Date } {
  const now = new Date();
  const end = to ? endOfDay(new Date(to)) : endOfDay(now);
  const start = from ? startOfDay(new Date(from)) : startOfDay(now);
  return { from: start, to: end };
}

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type WhereInput = Record<string, any>;

export function buildSessionsWhere(query: AdminSessionsQuery): WhereInput {
  const where: WhereInput = {};

  if (query.status) where.status = query.status;
  if (query.offlineOnly === true) where.syncedFromOffline = true;

  const siteFilter: WhereInput = {};
  if (query.siteId) siteFilter.id = query.siteId;
  if (query.city) siteFilter.city = { equals: query.city, mode: "insensitive" };
  if (Object.keys(siteFilter).length > 0) {
    where.connector = { chargePoint: { site: siteFilter } };
  }

  if (query.from || query.to) {
    const range: WhereInput = {};
    if (query.from) range.gte = startOfDay(new Date(query.from));
    if (query.to) range.lte = endOfDay(new Date(query.to));
    where.OR = [{ startedAt: range }, { AND: [{ startedAt: null }, { createdAt: range }] }];
  }

  if (query.search?.trim()) {
    const term = query.search.trim();
    const filter = {
      OR: [
        { id: { contains: term, mode: "insensitive" } },
        { user: { name: { contains: term, mode: "insensitive" } } },
        { user: { email: { contains: term, mode: "insensitive" } } },
        {
          connector: {
            chargePoint: { ocppId: { contains: term, mode: "insensitive" } },
          },
        },
      ],
    };
    where.AND = [...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []), filter];
  }

  return where;
}

export function buildSessionsOrderBy(query: AdminSessionsQuery): WhereInput {
  const dir = query.sortOrder;
  switch (query.sortBy) {
    case "startedAt":
      return { startedAt: dir };
    case "energyKwh":
      return { energyKwh: dir };
    case "costLkr":
      return { costLkr: dir };
    case "status":
      return { status: dir };
    default:
      return { createdAt: dir };
  }
}

export function buildChargePointsWhere(query: AdminChargePointsQuery): WhereInput {
  const where: WhereInput = {};

  if (query.status) where.status = query.status;

  const siteFilter: WhereInput = {};
  if (query.siteId) siteFilter.id = query.siteId;
  if (query.city) siteFilter.city = { equals: query.city, mode: "insensitive" };
  if (Object.keys(siteFilter).length > 0) where.site = siteFilter;

  if (query.staleOnly === true) {
    const staleBefore = new Date(Date.now() - HEARTBEAT_TIMEOUT_MS);
    where.OR = [{ lastHeartbeat: null }, { lastHeartbeat: { lt: staleBefore } }];
  }

  if (query.search?.trim()) {
    const term = query.search.trim();
    const filter = {
      OR: [
        { ocppId: { contains: term, mode: "insensitive" } },
        { model: { contains: term, mode: "insensitive" } },
        { site: { name: { contains: term, mode: "insensitive" } } },
        { site: { city: { contains: term, mode: "insensitive" } } },
      ],
    };
    where.AND = [...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []), filter];
  }

  return where;
}

export function buildChargePointsOrderBy(query: AdminChargePointsQuery): WhereInput {
  const dir = query.sortOrder;
  switch (query.sortBy) {
    case "status":
      return { status: dir };
    case "lastHeartbeat":
      return { lastHeartbeat: dir };
    case "maxKw":
      return { maxKw: dir };
    default:
      return { ocppId: dir };
  }
}

export function escapeCsvField(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
