"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "./Card";
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

type GunOption = {
  connectorId: string;
  connectorNum: number;
  status: string;
  maxKw: number;
};

function isAvailable(status: string) {
  return status.toLowerCase() === "available";
}

function flattenGuns(site: StationCardSite): GunOption[] {
  return site.chargePoints.flatMap((cp) =>
    cp.connectors.map((c) => ({
      connectorId: c.id,
      connectorNum: c.connectorNum,
      status: c.status,
      maxKw: cp.maxKw,
    }))
  );
}

export function StationCard({
  site,
  selected = false,
  onSelect,
}: {
  site: StationCardSite;
  selected?: boolean;
  onSelect?: (siteId: string) => void;
}) {
  const guns = flattenGuns(site);
  const availableGuns = guns.filter((g) => isAvailable(g.status));
  const [open, setOpen] = useState(selected);

  useEffect(() => {
    if (selected) setOpen(true);
  }, [selected]);

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next) onSelect?.(site.id);
  }

  return (
    <Card
      id={`station-${site.id}`}
      className={cn(
        "overflow-hidden p-0 transition-all duration-200",
        selected && "ring-2 ring-brand-amber shadow-md"
      )}
    >
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-start gap-2.5 px-3 py-3 text-left sm:gap-3 sm:px-4 sm:py-3.5"
        aria-expanded={open}
      >
        <Chevron open={open} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-bold leading-snug text-surface-ink sm:text-base">
              {site.name}
            </h3>
            <span className="shrink-0 font-mono text-sm font-bold text-surface-ink sm:text-base">
              {site.tariffLkrPerKwh}
              <span className="ml-0.5 text-[10px] font-normal text-surface-ink-muted">/kWh</span>
            </span>
          </div>
          <p className="mt-0.5 line-clamp-1 text-xs text-surface-ink-muted sm:text-sm">
            {site.address}
          </p>
          {!open && (
            <p className="mt-1.5 text-xs font-medium text-brand-teal">
              {availableGuns.length > 0
                ? availableGuns.length === 1
                  ? "1 charger ready — expand or start below"
                  : `${availableGuns.length} chargers ready — tap to pick`
                : "No chargers available"}
            </p>
          )}
        </div>
      </button>

      {!open && availableGuns.length === 1 && (
        <div className="border-t border-surface-border px-3 pb-3 sm:px-4">
          <Link
            href={`/charge/${availableGuns[0].connectorId}`}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-teal py-3 text-xs font-bold uppercase tracking-wide text-white transition-colors hover:bg-brand-teal/90 sm:text-sm"
          >
            Start — Gun {availableGuns[0].connectorNum}
          </Link>
        </div>
      )}

      {open && (
        <div className="border-t border-surface-border bg-surface-bg/50 px-3 pb-3 pt-2 sm:px-4 sm:pb-4">
          <GunPicker guns={guns} onCollapse={toggle} />
        </div>
      )}
    </Card>
  );
}

/** Compact responsive picker: 2-col grid on phone/tablet, horizontal scroll if many guns */
function GunPicker({
  guns,
  onCollapse,
}: {
  guns: GunOption[];
  onCollapse: () => void;
}) {
  const available = guns.filter((g) => isAvailable(g.status));
  const unavailable = guns.filter((g) => !isAvailable(g.status));
  const sorted = [...available, ...unavailable];
  const useHorizontalScroll = sorted.length > 4;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-brand-teal">
          {available.length > 0
            ? `${available.length} available — tap a tile`
            : "All chargers busy or offline"}
        </p>
        <button
          type="button"
          onClick={onCollapse}
          className="shrink-0 text-[11px] font-medium text-surface-ink-muted underline-offset-2 hover:text-brand-teal hover:underline"
        >
          Close
        </button>
      </div>

      <div
        className={cn(
          useHorizontalScroll
            ? "flex gap-2 overflow-x-auto overscroll-x-contain pb-1 snap-x snap-mandatory [-webkit-overflow-scrolling:touch]"
            : "grid grid-cols-2 gap-2 sm:grid-cols-2",
          !useHorizontalScroll &&
            sorted.length > 4 &&
            "max-h-[min(220px,40vh)] overflow-y-auto overscroll-contain"
        )}
      >
        {sorted.map((gun) => (
          <GunTile key={gun.connectorId} gun={gun} scroll={useHorizontalScroll} />
        ))}
      </div>
    </div>
  );
}

function GunTile({ gun, scroll }: { gun: GunOption; scroll?: boolean }) {
  const available = isAvailable(gun.status);

  const tileClass = cn(
    "flex flex-col rounded-xl border-2 p-2.5 transition-all duration-150 sm:p-3",
    scroll && "w-[calc(50%-0.25rem)] min-w-[7.75rem] shrink-0 snap-start sm:w-36",
    !scroll && "min-h-[5.25rem]",
    available
      ? "border-brand-teal bg-white shadow-sm hover:border-brand-teal hover:bg-brand-teal hover:shadow-md active:scale-[0.98] [&:hover_p]:text-white [&:hover_span]:text-white/90"
      : "cursor-default border-surface-border bg-surface-bg/80 opacity-55"
  );

  const content = (
    <>
      <div className="flex items-center justify-between gap-1">
        <span
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-md text-sm font-bold sm:h-8 sm:w-8",
            available ? "bg-brand-teal text-white" : "bg-surface-border text-surface-ink-muted"
          )}
        >
          {gun.connectorNum}
        </span>
        {available ? (
          <span className="text-[10px] font-bold uppercase tracking-wide text-brand-teal">Start</span>
        ) : (
          <span className="text-[9px] font-mono uppercase text-surface-ink-muted">{gun.status}</span>
        )}
      </div>
      <p
        className={cn(
          "mt-2 text-sm font-semibold leading-none",
          available ? "text-surface-ink" : "text-surface-ink-muted"
        )}
      >
        Gun {gun.connectorNum}
      </p>
      <p
        className={cn(
          "mt-0.5 font-mono text-[11px]",
          available ? "text-surface-ink-muted" : "text-surface-ink-muted/80"
        )}
      >
        {gun.maxKw}kW
      </p>
    </>
  );

  if (available) {
    return (
      <Link href={`/charge/${gun.connectorId}`} className={tileClass} aria-label={`Start charging gun ${gun.connectorNum}`}>
        {content}
      </Link>
    );
  }

  return (
    <div className={tileClass} aria-disabled title={`Gun ${gun.connectorNum} is ${gun.status}`}>
      {content}
    </div>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      className={cn(
        "mt-0.5 h-4 w-4 shrink-0 text-brand-teal transition-transform sm:h-5 sm:w-5",
        open && "rotate-90"
      )}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
