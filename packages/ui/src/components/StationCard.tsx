import Link from "next/link";
import { Card } from "./Card";
import { StatusBadge } from "./StatusBadge";
import { Button } from "./Button";
import { cn } from "../lib/cn";

export type StationCardChargePoint = {
  id: string;
  ocppId: string;
  model: string;
  maxKw: number;
  status: string;
  connectors: Array<{ id: string; connectorNum: number; status: string }>;
};

export type StationCardSite = {
  id: string;
  name: string;
  address: string;
  tariffLkrPerKwh: number;
  chargePoints: StationCardChargePoint[];
};

function firstAvailableConnector(site: StationCardSite): string | null {
  for (const cp of site.chargePoints) {
    for (const c of cp.connectors) {
      if (c.status.toLowerCase() === "available") return c.id;
    }
  }
  for (const cp of site.chargePoints) {
    if (cp.connectors[0]) return cp.connectors[0].id;
  }
  return null;
}

export function StationCard({ site }: { site: StationCardSite }) {
  const connectorId = firstAvailableConnector(site);
  const allOffline = site.chargePoints.every((cp) => cp.status.toLowerCase() === "offline");

  return (
    <Card className="flex flex-col gap-0 p-0 overflow-hidden">
      <div className="border-b border-surface-border px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold tracking-tight text-surface-ink">{site.name}</h3>
            <p className="mt-1 flex items-center gap-1 text-sm text-surface-ink-muted">
              <LocationIcon />
              {site.address}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-surface-ink-muted">
              Rate
            </p>
            <p className="font-mono text-lg font-semibold text-surface-ink">
              LKR {site.tariffLkrPerKwh}
              <span className="text-sm font-normal text-surface-ink-muted"> /kWh</span>
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-0 bg-surface-bg/60">
        {site.chargePoints.map((cp) => (
          <div
            key={cp.id}
            className="border-b border-surface-border px-5 py-3 last:border-b-0"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="font-mono text-xs font-medium text-surface-ink">{cp.ocppId}</span>
              <StatusBadge status={cp.status} />
            </div>
            <div className="grid grid-cols-3 gap-2 divide-x divide-surface-border text-center">
              <DataCol label="Model" value={cp.model} />
              <DataCol label="Power" value={`${cp.maxKw}kW`} mono />
              <DataCol
                label="Gun"
                value={
                  cp.connectors.length
                    ? `Gun ${cp.connectors[0].connectorNum} — ${cp.connectors[0].status}`
                    : "—"
                }
              />
            </div>
          </div>
        ))}
      </div>

      <div className="p-4">
        {connectorId && !allOffline ? (
          <Link href={`/charge/${connectorId}`} className="block w-full">
            <Button className="w-full" type="button">
              START CHARGE &gt;
            </Button>
          </Link>
        ) : (
          <Button className="w-full" disabled type="button">
            START CHARGE &gt;
          </Button>
        )}
      </div>
    </Card>
  );
}

function DataCol({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="px-1">
      <p className="text-[9px] font-semibold uppercase tracking-wider text-surface-ink-muted">
        {label}
      </p>
      <p className={cn("mt-0.5 text-xs text-surface-ink", mono && "font-mono font-medium")}>
        {value}
      </p>
    </div>
  );
}

function LocationIcon() {
  return (
    <svg className="inline shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7Zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Z"
        fill="currentColor"
      />
    </svg>
  );
}
