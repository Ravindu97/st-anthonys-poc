"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { StationCard, type StationCardSite } from "@st-anthonys/ui";
import { api } from "@/lib/api";

const StationMap = dynamic(() => import("@/components/StationMap"), { ssr: false });

type Site = StationCardSite & {
  city: string;
  latitude: number;
  longitude: number;
};

type StatusFilter = "all" | "available" | "busy" | "offline";

export default function HomePage() {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    api<Site[]>("/sites")
      .then(setSites)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sites.filter((site) => {
      const matchesSearch =
        !q ||
        site.name.toLowerCase().includes(q) ||
        site.city.toLowerCase().includes(q) ||
        site.address.toLowerCase().includes(q) ||
        site.chargePoints.some((cp) => cp.ocppId.toLowerCase().includes(q));

      if (!matchesSearch) return false;
      if (statusFilter === "all") return true;

      return site.chargePoints.some((cp) => {
        const s = cp.status.toLowerCase();
        if (statusFilter === "available") return s === "available";
        if (statusFilter === "busy") return s === "occupied" || s === "busy" || s === "charging";
        if (statusFilter === "offline") return s === "offline";
        return true;
      });
    });
  }, [sites, search, statusFilter]);

  if (loading) {
    return (
      <main className="mx-auto max-w-[1400px] px-4 py-12 text-center text-surface-ink-muted md:px-6">
        Loading stations…
      </main>
    );
  }

  return (
    <>
      <section className="border-b border-surface-border bg-surface-bg">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-4 px-4 py-6 md:px-6">
          <h1 className="text-2xl font-bold tracking-tight text-surface-ink md:text-3xl">
            The Charging Experience
          </h1>
          <div className="flex w-full flex-wrap items-center gap-3 md:w-auto">
            <div className="relative">
              <button
                type="button"
                onClick={() => setFiltersOpen((o) => !o)}
                className="inline-flex items-center gap-2 rounded-lg border border-surface-border bg-white px-4 py-2.5 text-xs font-semibold uppercase tracking-widest text-brand-teal transition-all duration-200 hover:bg-surface-bg"
              >
                <FunnelIcon />
                Filters
              </button>
              {filtersOpen && (
                <div className="absolute right-0 top-full z-20 mt-2 w-48 rounded-xl border border-surface-border bg-white p-3 shadow-sm">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-surface-ink-muted">
                    Status
                  </p>
                  {(
                    [
                      ["all", "All"],
                      ["available", "Available"],
                      ["busy", "Busy"],
                      ["offline", "Offline"],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        setStatusFilter(value);
                        setFiltersOpen(false);
                      }}
                      className={`block w-full rounded px-2 py-1.5 text-left text-sm ${
                        statusFilter === value
                          ? "bg-brand-teal/10 font-semibold text-brand-teal"
                          : "text-surface-ink hover:bg-surface-bg"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="relative min-w-[200px] flex-1 md:w-72">
              <SearchIcon />
              <input
                type="search"
                placeholder="Find a station…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-surface-border bg-white py-2.5 pl-10 pr-4 text-sm shadow-sm transition-all duration-200 focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/20"
              />
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto grid max-w-[1400px] gap-6 px-4 py-6 md:grid-cols-[1.2fr_1fr] md:px-6 md:py-8">
        <div className="min-h-[480px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <StationMap sites={filtered} />
        </div>

        <div className="flex max-h-[calc(100vh-280px)] flex-col gap-4 overflow-y-auto pr-1">
          {filtered.length === 0 ? (
            <p className="text-center text-sm text-surface-ink-muted">No stations match your search.</p>
          ) : (
            filtered.map((site) => <StationCard key={site.id} site={site} />)
          )}
        </div>
      </main>
    </>
  );
}

function FunnelIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 6h16M7 12h10M10 18h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-surface-ink-muted"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="M16 16l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
