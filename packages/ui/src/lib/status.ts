export type StatusVariant = "available" | "busy" | "offline" | "maintenance";

export function statusToVariant(status: string): StatusVariant {
  const s = status.toLowerCase();
  if (s === "available") return "available";
  if (s === "occupied" || s === "busy" || s === "charging" || s === "active" || s === "pending")
    return "busy";
  if (s === "offline" || s === "faulted" || s === "unavailable") return "offline";
  return "maintenance";
}

export function statusLabel(status: string): string {
  const s = status.toLowerCase();
  if (s === "occupied") return "BUSY";
  return status.toUpperCase();
}
