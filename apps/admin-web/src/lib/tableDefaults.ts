export const CHARGE_POINTS_TABLE_DEFAULTS = {
  sortBy: "ocppId",
  sortOrder: "asc",
} as const;

export const SESSIONS_TABLE_DEFAULTS = {
  sortBy: "createdAt",
  sortOrder: "desc",
} as const;

export const HUBS_TABLE_DEFAULTS = {
  sortBy: "utilizationPercent",
  sortOrder: "desc",
} as const;
