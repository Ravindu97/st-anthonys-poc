"use client";

import { Suspense, useEffect, useState } from "react";
import type { AdminHubSummary } from "@st-anthonys/shared";
import {
  Card,
  DataTable,
  DataTableBody,
  DataTableHead,
  DataTableTd,
  DataTableTh,
  EmptyState,
  FilterBar,
  PageTitle,
  Select,
  SortableTableHead,
} from "@st-anthonys/ui";
import { subscribeEvents } from "@/lib/api";
import { useAdminList } from "@/hooks/useAdminTable";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { useSites } from "@/hooks/useSites";
import { HUBS_TABLE_DEFAULTS } from "@/lib/tableDefaults";

function HubsContent() {
  useAuthGuard();
  const { cities } = useSites();
  const [view, setView] = useState<"cards" | "table">("cards");
  const { items: hubs, loading, params, setParams, clearFilters, refetch } = useAdminList<AdminHubSummary>({
    endpoint: "/admin/hubs",
    defaultParams: HUBS_TABLE_DEFAULTS,
  });

  useEffect(() => {
    const unsub = subscribeEvents((ch) => {
      if (ch === "hub:load") refetch();
    });
    return unsub;
  }, [refetch]);

  const sortBy = String(params.sortBy ?? "utilizationPercent");
  const sortOrder = (params.sortOrder as "asc" | "desc") ?? "desc";

  function handleSort(key: string) {
    const nextOrder = sortBy === key && sortOrder === "desc" ? "asc" : "desc";
    setParams({ sortBy: key, sortOrder: nextOrder });
  }

  const hasFilters = Boolean(params.city || params.minUtilization);

  return (
    <>
      <PageTitle
        action={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setView("cards")}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold uppercase tracking-wider ${
                view === "cards"
                  ? "border-brand-teal bg-brand-teal text-white"
                  : "border-surface-border text-surface-ink-muted"
              }`}
            >
              Cards
            </button>
            <button
              type="button"
              onClick={() => setView("table")}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold uppercase tracking-wider ${
                view === "table"
                  ? "border-brand-teal bg-brand-teal text-white"
                  : "border-surface-border text-surface-ink-muted"
              }`}
            >
              Table
            </button>
          </div>
        }
      >
        Hub load balancing
      </PageTitle>
      <Card className="mb-4 p-4">
        <FilterBar>
          <Select
            label="City"
            value={String(params.city ?? "")}
            onChange={(e) => setParams({ city: e.target.value })}
          >
            <option value="">All cities</option>
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-semibold uppercase tracking-wider text-surface-ink-muted">
              Min utilization %
            </span>
            <input
              type="number"
              min={0}
              max={100}
              placeholder="0"
              value={String(params.minUtilization ?? "")}
              onChange={(e) =>
                setParams({ minUtilization: e.target.value ? Number(e.target.value) : undefined })
              }
              className="w-24 rounded-lg border border-surface-border px-3 py-2 text-sm"
            />
          </label>
        </FilterBar>
      </Card>
      {loading ? (
        <p className="text-sm text-surface-ink-muted">Loading hubs…</p>
      ) : hubs.length === 0 ? (
        <Card>
          <EmptyState onClearFilters={hasFilters ? clearFilters : undefined} />
        </Card>
      ) : view === "cards" ? (
        <div className="space-y-4">
          {hubs.map((hub) => (
            <Card key={hub.id}>
              <h3 className="text-lg font-bold tracking-tight">{hub.siteName}</h3>
              <p className="text-sm text-surface-ink-muted">
                {hub.city} · {hub.activeSessions} active session(s)
              </p>
              <p className="mt-2 font-mono text-sm">
                {hub.allocatedKw.toFixed(0)} / {hub.maxHubKw} kW ({hub.utilizationPercent}%)
              </p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-border">
                <div
                  className="h-full rounded-full bg-brand-teal transition-all duration-300"
                  style={{ width: `${Math.min(100, hub.utilizationPercent)}%` }}
                />
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="overflow-hidden p-0">
          <DataTable>
            <DataTableHead>
              <SortableTableHead label="Site" sortKey="siteName" currentSortBy={sortBy} currentSortOrder={sortOrder} onSort={handleSort} />
              <DataTableTh>City</DataTableTh>
              <DataTableTh>Active sessions</DataTableTh>
              <SortableTableHead label="Allocated kW" sortKey="allocatedKw" currentSortBy={sortBy} currentSortOrder={sortOrder} onSort={handleSort} />
              <SortableTableHead label="Utilization" sortKey="utilizationPercent" currentSortBy={sortBy} currentSortOrder={sortOrder} onSort={handleSort} />
              <DataTableTh>Load</DataTableTh>
            </DataTableHead>
            <DataTableBody>
              {hubs.map((hub) => (
                <tr key={hub.id}>
                  <DataTableTd>{hub.siteName}</DataTableTd>
                  <DataTableTd>{hub.city}</DataTableTd>
                  <DataTableTd>{hub.activeSessions}</DataTableTd>
                  <DataTableTd mono>
                    {hub.allocatedKw.toFixed(0)} / {hub.maxHubKw}
                  </DataTableTd>
                  <DataTableTd mono>{hub.utilizationPercent}%</DataTableTd>
                  <DataTableTd>
                    <div className="h-2 w-32 overflow-hidden rounded-full bg-surface-border">
                      <div
                        className="h-full rounded-full bg-brand-teal"
                        style={{ width: `${Math.min(100, hub.utilizationPercent)}%` }}
                      />
                    </div>
                  </DataTableTd>
                </tr>
              ))}
            </DataTableBody>
          </DataTable>
        </Card>
      )}
    </>
  );
}

export default function HubsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-surface-ink-muted">Loading hubs…</p>}>
      <HubsContent />
    </Suspense>
  );
}
