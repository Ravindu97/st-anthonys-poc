"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import type { AdminFleetSnapshot, AdminOverview, AdminTrendsResponse } from "@st-anthonys/shared";
import { Card, DateRangeFilter, PageTitle, StatCard } from "@st-anthonys/ui";
import { api, buildQuery, subscribeEvents } from "@/lib/api";
import { dateRangePreset } from "@/lib/format";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { DateRangePresets } from "@/components/DateRangePresets";
import { TrendLineChart } from "@/components/charts/TrendLineChart";
import { StatusBarChart } from "@/components/charts/StatusBarChart";
import { HubUtilizationChart } from "@/components/charts/HubUtilizationChart";
import type { AdminHubSummary } from "@st-anthonys/shared";

function OverviewContent() {
  useAuthGuard();
  const today = dateRangePreset(1);
  const [from, setFrom] = useState(today.from);
  const [to, setTo] = useState(today.to);
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [trends, setTrends] = useState<AdminTrendsResponse | null>(null);
  const [fleet, setFleet] = useState<AdminFleetSnapshot | null>(null);
  const [hubs, setHubs] = useState<AdminHubSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const q = { from, to };
    try {
      const [ov, tr, fl, hb] = await Promise.all([
        api<AdminOverview>(`/admin/overview${buildQuery(q)}`),
        api<AdminTrendsResponse>(`/admin/analytics/trends${buildQuery(q)}`),
        api<AdminFleetSnapshot>(`/admin/analytics/fleet${buildQuery(q)}`),
        api<AdminHubSummary[]>(`/admin/hubs`),
      ]);
      setOverview(ov);
      setTrends(tr);
      setFleet(fl);
      setHubs(hb);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  useEffect(() => {
    const unsub = subscribeEvents(() => {
      load();
    });
    return unsub;
  }, [load]);

  return (
    <>
      <PageTitle>Network overview</PageTitle>
      <Card className="mb-6 p-4">
        <div className="flex flex-col gap-4">
          <DateRangePresets from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t); }} />
          <DateRangeFilter
            from={from}
            to={to}
            onFromChange={setFrom}
            onToChange={setTo}
          />
        </div>
      </Card>
      {loading && !overview ? (
        <p className="text-sm text-surface-ink-muted">Loading overview…</p>
      ) : overview ? (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <StatCard
              value={`${overview.onlineChargePoints}/${overview.totalChargePoints}`}
              label="Charge points online"
            />
            <StatCard value={overview.activeSessions} label="Active sessions" />
            <StatCard value={overview.completedSessions} label="Completed sessions" />
            <StatCard value={overview.totalKwh} label="kWh delivered" />
            <StatCard value={`LKR ${overview.totalRevenueLkr}`} label="Revenue (range)" />
            <StatCard value={overview.faultedChargePoints} label="Faulted units" />
          </div>
          <div className="mb-6 grid gap-4 lg:grid-cols-2">
            <Card>
              <h3 className="mb-4 font-bold tracking-tight text-surface-ink">Energy & revenue trend</h3>
              <TrendLineChart buckets={trends?.buckets ?? []} />
            </Card>
            <Card>
              <h3 className="mb-4 font-bold tracking-tight text-surface-ink">Fleet status by city</h3>
              <StatusBarChart data={fleet?.chargePointsByCity ?? []} />
            </Card>
          </div>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <p className="text-xs font-semibold uppercase tracking-wider text-surface-ink-muted">Connectors occupied</p>
              <p className="mt-2 text-2xl font-bold">{fleet?.connectorOccupied ?? 0}</p>
            </Card>
            <Card>
              <p className="text-xs font-semibold uppercase tracking-wider text-surface-ink-muted">Connectors available</p>
              <p className="mt-2 text-2xl font-bold">{fleet?.connectorAvailable ?? 0}</p>
            </Card>
            <Card>
              <p className="text-xs font-semibold uppercase tracking-wider text-surface-ink-muted">Offline sync sessions</p>
              <p className="mt-2 text-2xl font-bold">{fleet?.offlineSyncSessions ?? 0}</p>
            </Card>
            <Card>
              <p className="text-xs font-semibold uppercase tracking-wider text-surface-ink-muted">Failed sessions</p>
              <p className="mt-2 text-2xl font-bold">{fleet?.failedSessions ?? 0}</p>
            </Card>
          </div>
          <Card>
            <h3 className="mb-4 font-bold tracking-tight text-surface-ink">Hub utilization (live)</h3>
            <HubUtilizationChart hubs={hubs} />
          </Card>
        </>
      ) : null}
    </>
  );
}

export default function AdminOverviewPage() {
  return (
    <Suspense fallback={<p className="text-sm text-surface-ink-muted">Loading…</p>}>
      <OverviewContent />
    </Suspense>
  );
}
