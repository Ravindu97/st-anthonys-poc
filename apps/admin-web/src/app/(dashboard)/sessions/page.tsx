"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Banner,
  Button,
  Card,
  DataTable,
  DataTableBody,
  DataTableHead,
  DataTableTd,
  DataTableTh,
  DateRangeFilter,
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
import { downloadCsv, subscribeEvents } from "@/lib/api";
import { formatDateTime, formatKwh, formatLkr } from "@/lib/format";
import { useAdminTable } from "@/hooks/useAdminTable";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { useSites } from "@/hooks/useSites";
import { SESSIONS_TABLE_DEFAULTS } from "@/lib/tableDefaults";

type Session = {
  id: string;
  status: string;
  energyKwh: number;
  costLkr: number;
  syncedFromOffline: boolean;
  startedAt: string | null;
  stoppedAt: string | null;
  user: { email: string; name: string };
  connector: { connectorNum: number; chargePoint: { ocppId: string; site: { city: string; name: string } } };
};

function SessionsContent() {
  useAuthGuard();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { sites, cities } = useSites();
  const {
    items,
    total,
    page,
    pageSize,
    loading,
    error,
    params,
    setParams,
    clearFilters,
    refetch,
    search,
    sortBy,
    sortOrder,
  } = useAdminTable<Session>({
    endpoint: "/admin/sessions",
    defaultParams: SESSIONS_TABLE_DEFAULTS,
  });

  useEffect(() => {
    const unsub = subscribeEvents((ch) => {
      if (ch === "session:update") refetch();
    });
    return unsub;
  }, [refetch]);

  function handleSort(key: string) {
    const nextOrder = sortBy === key && sortOrder === "desc" ? "asc" : "desc";
    setParams({ sortBy: key, sortOrder: nextOrder }, true);
  }

  async function handleExport() {
    const exportParams: Record<string, string | number | boolean | undefined> = { ...params };
    delete exportParams.page;
    delete exportParams.pageSize;
    await downloadCsv("/admin/sessions/export", exportParams, "sessions.csv");
  }

  const listQuery = searchParams.toString();
  const hasFilters = Boolean(
    params.status || params.siteId || params.city || params.search || params.from || params.offlineOnly
  );

  return (
    <>
      <PageTitle
        action={
          <Button variant="ghost" type="button" onClick={handleExport} disabled={loading}>
            Export CSV
          </Button>
        }
      >
        Sessions
      </PageTitle>
      {error && (
        <Banner variant="error" className="mb-4">
          {error}
        </Banner>
      )}
      <Card className="overflow-hidden p-0">
        <TableToolbar
          search={search}
          onSearchChange={(v) => setParams({ search: v }, true)}
          searchPlaceholder="User, email, OCPP ID, session ID…"
          filters={
            <FilterBar>
              <Select
                label="Status"
                value={String(params.status ?? "")}
                onChange={(e) => setParams({ status: e.target.value }, true)}
              >
                <option value="">All</option>
                <option value="pending">Pending</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
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
              <DateRangeFilter
                from={String(params.from ?? "")}
                to={String(params.to ?? "")}
                onFromChange={(v) => setParams({ from: v }, true)}
                onToChange={(v) => setParams({ to: v }, true)}
              />
              <label className="flex items-center gap-2 pb-2 text-sm">
                <input
                  type="checkbox"
                  checked={params.offlineOnly === "true"}
                  onChange={(e) =>
                    setParams({ offlineOnly: e.target.checked ? "true" : undefined }, true)
                  }
                />
                Offline sync only
              </label>
            </FilterBar>
          }
        />
        <DataTable>
          <DataTableHead>
            <SortableTableHead label="Started" sortKey="startedAt" currentSortBy={sortBy} currentSortOrder={sortOrder} onSort={handleSort} />
            <DataTableTh>User</DataTableTh>
            <DataTableTh>Location</DataTableTh>
            <SortableTableHead label="Status" sortKey="status" currentSortBy={sortBy} currentSortOrder={sortOrder} onSort={handleSort} />
            <SortableTableHead label="kWh" sortKey="energyKwh" currentSortBy={sortBy} currentSortOrder={sortOrder} onSort={handleSort} />
            <SortableTableHead label="LKR" sortKey="costLkr" currentSortBy={sortBy} currentSortOrder={sortOrder} onSort={handleSort} />
            <DataTableTh>Offline</DataTableTh>
          </DataTableHead>
          {loading ? (
            <TableSkeleton rows={8} cols={7} />
          ) : items.length === 0 ? (
            <tbody>
              <tr>
                <td colSpan={7}>
                  <EmptyState
                    description="Try adjusting filters or date range."
                    onClearFilters={hasFilters ? clearFilters : undefined}
                  />
                </td>
              </tr>
            </tbody>
          ) : (
            <DataTableBody>
              {items.map((s) => (
                <tr
                  key={s.id}
                  className="cursor-pointer hover:bg-surface-bg"
                  onClick={() => router.push(`/sessions/${s.id}${listQuery ? `?${listQuery}` : ""}`)}
                >
                  <DataTableTd mono>{formatDateTime(s.startedAt)}</DataTableTd>
                  <DataTableTd>{s.user.name}</DataTableTd>
                  <DataTableTd>
                    {s.connector.chargePoint.site.city} ·{" "}
                    <span className="font-mono text-xs">{s.connector.chargePoint.ocppId}</span> G
                    {s.connector.connectorNum}
                  </DataTableTd>
                  <DataTableTd>
                    <StatusBadge status={s.status} />
                  </DataTableTd>
                  <DataTableTd mono>{formatKwh(s.energyKwh)}</DataTableTd>
                  <DataTableTd mono>{formatLkr(s.costLkr)}</DataTableTd>
                  <DataTableTd>{s.syncedFromOffline ? "Yes" : "—"}</DataTableTd>
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

export default function SessionsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-surface-ink-muted">Loading sessions…</p>}>
      <SessionsContent />
    </Suspense>
  );
}
