import { z } from "zod";
import { ChargePointStatusSchema, SessionStatusSchema } from "./types.js";

export const SortOrderSchema = z.enum(["asc", "desc"]);
export type SortOrder = z.infer<typeof SortOrderSchema>;

export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});
export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;

export function createPaginatedResponseSchema<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({
    items: z.array(itemSchema),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
  });
}

export type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

export const AdminSessionsQuerySchema = PaginationQuerySchema.extend({
  status: SessionStatusSchema.optional(),
  siteId: z.string().optional(),
  city: z.string().optional(),
  search: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  offlineOnly: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
  sortBy: z
    .enum(["createdAt", "startedAt", "energyKwh", "costLkr", "status"])
    .default("createdAt"),
  sortOrder: SortOrderSchema.default("desc"),
});
export type AdminSessionsQuery = z.infer<typeof AdminSessionsQuerySchema>;

export const AdminChargePointsQuerySchema = PaginationQuerySchema.extend({
  status: ChargePointStatusSchema.optional(),
  siteId: z.string().optional(),
  city: z.string().optional(),
  search: z.string().optional(),
  staleOnly: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
  sortBy: z.enum(["ocppId", "status", "lastHeartbeat", "maxKw"]).default("ocppId"),
  sortOrder: SortOrderSchema.default("asc"),
});
export type AdminChargePointsQuery = z.infer<typeof AdminChargePointsQuerySchema>;

export const AdminHubsQuerySchema = z.object({
  city: z.string().optional(),
  sortBy: z.enum(["utilizationPercent", "allocatedKw", "siteName"]).default("utilizationPercent"),
  sortOrder: SortOrderSchema.default("desc"),
  minUtilization: z.coerce.number().min(0).max(100).optional(),
});
export type AdminHubsQuery = z.infer<typeof AdminHubsQuerySchema>;

export const AdminDateRangeQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});
export type AdminDateRangeQuery = z.infer<typeof AdminDateRangeQuerySchema>;

export const AdminTrendsQuerySchema = AdminDateRangeQuerySchema.extend({
  granularity: z.enum(["day"]).default("day"),
});
export type AdminTrendsQuery = z.infer<typeof AdminTrendsQuerySchema>;

export const AdminSiteOptionSchema = z.object({
  id: z.string(),
  name: z.string(),
  city: z.string(),
});
export type AdminSiteOption = z.infer<typeof AdminSiteOptionSchema>;

export const AdminTrendBucketSchema = z.object({
  date: z.string(),
  sessionCount: z.number(),
  completedCount: z.number(),
  totalKwh: z.number(),
  totalRevenueLkr: z.number(),
});
export type AdminTrendBucket = z.infer<typeof AdminTrendBucketSchema>;

export const AdminTrendsResponseSchema = z.object({
  buckets: z.array(AdminTrendBucketSchema),
  from: z.string(),
  to: z.string(),
});
export type AdminTrendsResponse = z.infer<typeof AdminTrendsResponseSchema>;

export const AdminFleetByCitySchema = z.object({
  city: z.string(),
  available: z.number(),
  charging: z.number(),
  faulted: z.number(),
  offline: z.number(),
  unavailable: z.number(),
});
export type AdminFleetByCity = z.infer<typeof AdminFleetByCitySchema>;

export const AdminFleetSnapshotSchema = z.object({
  chargePointsByCity: z.array(AdminFleetByCitySchema),
  connectorOccupied: z.number(),
  connectorAvailable: z.number(),
  connectorFaulted: z.number(),
  offlineSyncSessions: z.number(),
  failedSessions: z.number(),
  from: z.string(),
  to: z.string(),
});
export type AdminFleetSnapshot = z.infer<typeof AdminFleetSnapshotSchema>;

export const AdminOverviewSchema = z.object({
  totalChargePoints: z.number(),
  onlineChargePoints: z.number(),
  offlineChargePoints: z.number(),
  activeSessions: z.number(),
  totalKwh: z.number(),
  totalRevenueLkr: z.number(),
  faultedChargePoints: z.number(),
  completedSessions: z.number(),
  from: z.string(),
  to: z.string(),
});
export type AdminOverview = z.infer<typeof AdminOverviewSchema>;

export const AdminHubSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  siteName: z.string(),
  city: z.string(),
  maxHubKw: z.number(),
  allocatedKw: z.number(),
  utilizationPercent: z.number(),
  activeSessions: z.number(),
});
export type AdminHubSummary = z.infer<typeof AdminHubSummarySchema>;
