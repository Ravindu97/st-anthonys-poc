"use client";

import { Suspense, useEffect, useState } from "react";
import {
  Banner,
  Button,
  Card,
  DataTable,
  DataTableBody,
  DataTableHead,
  DataTableTd,
  DataTableTh,
  EmptyState,
  FilterBar,
  PageTitle,
  Pagination,
  Select,
  SortableTableHead,
  StatusBadge,
  TableSkeleton,
  TableToolbar,
} from "@st-anthonys/ui";
import { api, subscribeEvents } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { useAdminTable } from "@/hooks/useAdminTable";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { useSites } from "@/hooks/useSites";
import { CHARGE_POINTS_TABLE_DEFAULTS } from "@/lib/tableDefaults";

type ChargePoint = {
  id: string;
  ocppId: string;
  model: string;
  maxKw: number;
  status: string;
  lastHeartbeat: string | null;
  site: { name: string; city: string };
  connectors: Array<{ connectorNum: number; status: string }>;
};

function connectorSummary(connectors: ChargePoint["connectors"]): string {
  const counts = connectors.reduce(
    (acc, c) => {
      const key = c.status.toLowerCase();
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );
  return Object.entries(counts)
    .map(([k, n]) => `${n} ${k}`)
    .join(" · ");
}

function ChargePointsContent() {
  useAuthGuard();
  const { sites, cities } = useSites();
  const [banner, setBanner] = useState<{ variant: "success" | "error"; message: string } | null>(null);
  const [resetting, setResetting] = useState<string | null>(null);
  const {
    items,
    total,
    page,
    pageSize,
    loading,
    error: tableError,
    params,
    setParams,
    clearFilters,
    refetch,
    search,
    sortBy,
    sortOrder,
  } = useAdminTable<ChargePoint>({
    endpoint: "/admin/charge-points",
    defaultParams: CHARGE_POINTS_TABLE_DEFAULTS,
  });

  useEffect(() => {
    const unsub = subscribeEvents((ch) => {
      if (ch === "chargepoint:update") refetch();
    });
    return unsub;
  }, [refetch]);

  function handleSort(key: string) {
    const nextOrder = sortBy === key && sortOrder === "asc" ? "desc" : "asc";
    setParams({ sortBy: key, sortOrder: nextOrder }, true);
  }

  async function handleReset(ocppId: string) {
    if (!confirm(`Send soft reset to ${ocppId}?`)) return;
    setResetting(ocppId);
    try {
      await api(`/admin/charge-points/${ocppId}/reset`, {
        method: "POST",
        body: JSON.stringify({ type: "Soft" }),
      });
      setBanner({ variant: "success", message: `Reset sent to ${ocppId}` });
      refetch();
    } catch (e) {
      setBanner({ variant: "error", message: e instanceof Error ? e.message : "Reset failed" });
    } finally {
      setResetting(null);
    }
  }

  const hasFilters = Boolean(params.status || params.siteId || params.city || params.search || params.staleOnly);

  return (
    <>
      <PageTitle>Charge points</PageTitle>
      {(banner || tableError) && (
        <Banner
          variant={banner?.variant ?? "error"}
          onDismiss={banner ? () => setBanner(null) : undefined}
          className="mb-4"
        >
          {banner?.message ?? tableError}
        </Banner>
      )}
      <Card className="overflow-hidden p-0">
        <TableToolbar
          search={search}
          onSearchChange={(v) => setParams({ search: v }, true)}
          searchPlaceholder="OCPP ID, model, site…"
          filters={
            <FilterBar>
              <Select
                label="Status"
                value={String(params.status ?? "")}
                onChange={(e) => setParams({ status: e.target.value }, true)}
              >
                <option value="">All</option>
                <option value="Available">Available</option>
                <option value="Charging">Charging</option>
                <option value="Faulted">Faulted</option>
                <option value="Offline">Offline</option>
                <option value="Unavailable">Unavailable</option>
              </Select>
              <Select
                label="Site"
                value={String(params.siteId ?? "")}
                onChange={(e) => setParams({ siteId: e.target.value }, true)}
              >
                <option value="">All sites</option>
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
              <Select
                label="City"
                value={String(params.city ?? "")}
                onChange={(e) => setParams({ city: e.target.value }, true)}
              >
                <option value="">All cities</option>
                {cities.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
              <label className="flex items-center gap-2 pb-2 text-sm">
                <input
                  type="checkbox"
                  checked={params.staleOnly === "true"}
                  onChange={(e) =>
                    setParams({ staleOnly: e.target.checked ? "true" : undefined }, true)
                  }
                />
                Stale heartbeat only
              </label>
            </FilterBar>
          }
        />
        <DataTable>
          <DataTableHead>
            <SortableTableHead label="OCPP ID" sortKey="ocppId" currentSortBy={sortBy} currentSortOrder={sortOrder} onSort={handleSort} />
            <DataTableTh>Site</DataTableTh>
            <DataTableTh>Model</DataTableTh>
            <SortableTableHead label="Status" sortKey="status" currentSortBy={sortBy} currentSortOrder={sortOrder} onSort={handleSort} />
            <DataTableTh>Connectors</DataTableTh>
            <SortableTableHead label="Heartbeat" sortKey="lastHeartbeat" currentSortBy={sortBy} currentSortOrder={sortOrder} onSort={handleSort} />
            <DataTableTh>Actions</DataTableTh>
          </DataTableHead>
          {loading ? (
            <TableSkeleton rows={6} cols={7} />
          ) : items.length === 0 ? (
            <tbody>
              <tr>
                <td colSpan={7}>
                  <EmptyState onClearFilters={hasFilters ? clearFilters : undefined} />
                </td>
              </tr>
            </tbody>
          ) : (
            <DataTableBody>
              {items.map((cp) => (
                <tr key={cp.id}>
                  <DataTableTd mono>{cp.ocppId}</DataTableTd>
                  <DataTableTd>{cp.site.city}</DataTableTd>
                  <DataTableTd>
                    {cp.model}{" "}
                    <span className="font-mono text-xs text-surface-ink-muted">({cp.maxKw} kW)</span>
                  </DataTableTd>
                  <DataTableTd>
                    <StatusBadge status={cp.status} />
                  </DataTableTd>
                  <DataTableTd className="text-xs text-surface-ink-muted">
                    {connectorSummary(cp.connectors)}
                  </DataTableTd>
                  <DataTableTd mono>{formatDateTime(cp.lastHeartbeat)}</DataTableTd>
                  <DataTableTd>
                    <Button
                      variant="danger"
                      type="button"
                      disabled={resetting === cp.ocppId}
                      onClick={() => handleReset(cp.ocppId)}
                    >
                      Reset
                    </Button>
                  </DataTableTd>
                </tr>
              ))}
            </DataTableBody>
          )}
        </DataTable>
        <Pagination
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={(p) => setParams({ page: p })}
          onPageSizeChange={(s) => setParams({ pageSize: s, page: 1 })}
        />
      </Card>
    </>
  );
}

export default function ChargePointsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-surface-ink-muted">Loading charge points…</p>}>
      <ChargePointsContent />
    </Suspense>
  );
}
