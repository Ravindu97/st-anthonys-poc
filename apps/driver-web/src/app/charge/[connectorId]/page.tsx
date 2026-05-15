"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Button, Card, PageTitle, StatusBadge } from "@st-anthonys/ui";
import { api, getToken, subscribeEvents } from "@/lib/api";

type ConnectorInfo = {
  id: string;
  connectorNum: number;
  status: string;
  tariffLkrPerKwh: number;
  chargePoint: { ocppId: string; model: string; maxKw: number; status: string };
  site: { name: string; city: string };
};

type Session = {
  id: string;
  status: string;
  energyKwh: number;
  costLkr: number;
  allocatedKw: number | null;
  syncedFromOffline: boolean;
  meterValues: Array<{
    timestamp: string;
    powerKw: number;
    energyKwh: number;
    socPercent: number | null;
    batteryTempC: number | null;
  }>;
};

export default function ChargePage() {
  const { connectorId } = useParams<{ connectorId: string }>();
  const router = useRouter();
  const [connector, setConnector] = useState<ConnectorInfo | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [live, setLive] = useState({ powerKw: 0, soc: 0, temp: 0, energy: 0, cost: 0 });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const sessionIdRef = useRef<string | null>(null);

  function syncLiveFromSession(s: Session) {
    const latest = s.meterValues?.[0];
    if (latest) {
      setLive({
        powerKw: latest.powerKw,
        soc: latest.socPercent ?? 0,
        temp: latest.batteryTempC ?? 0,
        energy: latest.energyKwh,
        cost: s.costLkr ?? 0,
      });
    } else {
      setLive((prev) => ({
        ...prev,
        energy: s.energyKwh,
        cost: s.costLkr ?? prev.cost,
      }));
    }
  }

  const refresh = useCallback(async () => {
    const conn = await api<ConnectorInfo>(`/connectors/${connectorId}`);
    setConnector(conn);
    try {
      const active = await api<Session | null>(`/sessions/active?connectorId=${connectorId}`);
      if (active && active.status !== "completed") {
        setSession(active);
        sessionIdRef.current = active.id;
        syncLiveFromSession(active);
      } else {
        setSession(null);
        sessionIdRef.current = null;
      }
    } catch {
      setSession(null);
      sessionIdRef.current = null;
    }
  }, [connectorId]);

  useEffect(() => {
    if (!getToken()) {
      router.push("/login");
      return;
    }
    refresh().finally(() => setLoading(false));
  }, [connectorId, router, refresh]);

  useEffect(() => {
    sessionIdRef.current = session?.id ?? null;
  }, [session?.id]);

  useEffect(() => {
    const unsub = subscribeEvents((channel, data) => {
      const d = data as {
        sessionId?: string;
        powerKw?: number;
        socPercent?: number;
        batteryTempC?: number;
        energyKwh?: number;
        costLkr?: number;
        status?: string;
      };
      if (channel !== "session:update" || !d.sessionId) return;
      if (d.sessionId !== sessionIdRef.current) return;

      if (d.status) {
        setSession((prev) =>
          prev && prev.id === d.sessionId ? { ...prev, status: d.status! } : prev
        );
      }
      setLive((prev) => ({
        powerKw: d.powerKw ?? prev.powerKw,
        soc: d.socPercent ?? prev.soc,
        temp: d.batteryTempC ?? prev.temp,
        energy: d.energyKwh ?? prev.energy,
        cost: d.costLkr ?? prev.cost,
      }));
      if (d.status === "completed" || d.status === "active") refresh();
    });
    return unsub;
  }, [refresh]);

  useEffect(() => {
    if (!session) return;
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [session, refresh]);

  async function startCharge() {
    setActionLoading(true);
    try {
      const res = await api<{ sessionId: string; status: string }>("/sessions/start", {
        method: "POST",
        body: JSON.stringify({ connectorId }),
      });
      sessionIdRef.current = res.sessionId;
      setSession({
        id: res.sessionId,
        status: res.status,
        energyKwh: 0,
        costLkr: 0,
        allocatedKw: null,
        syncedFromOffline: false,
        meterValues: [],
      });
      await refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to start");
    } finally {
      setActionLoading(false);
    }
  }

  async function cancelPending() {
    if (!session) return;
    setActionLoading(true);
    try {
      await api(`/sessions/${session.id}/cancel`, { method: "POST" });
      setSession(null);
      sessionIdRef.current = null;
      setLive({ powerKw: 0, soc: 0, temp: 0, energy: 0, cost: 0 });
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to cancel");
    } finally {
      setActionLoading(false);
    }
  }

  async function retryPending() {
    if (!session) return;
    setActionLoading(true);
    try {
      await api(`/sessions/${session.id}/retry`, { method: "POST" });
      await refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to retry");
    } finally {
      setActionLoading(false);
    }
  }

  async function stopCharge() {
    if (!session) return;
    setActionLoading(true);
    try {
      await api(`/sessions/${session.id}/stop`, { method: "POST" });
      router.push(`/receipt/${session.id}`);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to stop");
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12 text-center text-surface-ink-muted">
        Loading…
      </main>
    );
  }
  if (!connector) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12 text-center text-surface-ink-muted">
        Connector not found
      </main>
    );
  }

  const isActive = session?.status === "active" || session?.status === "pending";
  const chartData = (session?.meterValues ?? []).map((mv) => ({
    time: new Date(mv.timestamp).toLocaleTimeString(),
    kW: mv.powerKw,
    soc: mv.socPercent ?? 0,
  }));

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-8 md:px-6">
      <PageTitle>{connector.site.name}</PageTitle>

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-sm text-surface-ink">
              {connector.chargePoint.ocppId} · Gun {connector.connectorNum}
            </p>
            <p className="text-sm text-surface-ink-muted">{connector.chargePoint.model}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-surface-ink-muted">
              Rate
            </p>
            <p className="font-mono text-lg font-semibold">
              LKR {connector.tariffLkrPerKwh}
              <span className="text-sm font-normal text-surface-ink-muted"> /kWh</span>
            </p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <StatusBadge status={connector.status} />
          {session?.syncedFromOffline && (
            <span className="rounded bg-brand-teal/10 px-2 py-0.5 font-mono text-[10px] uppercase text-brand-teal">
              Synced from offline
            </span>
          )}
        </div>
      </Card>

      {isActive ? (
        <Card>
          <h3 className="text-lg font-bold tracking-tight">
            {session?.status === "pending" ? "Starting session…" : "Charging in progress"}
          </h3>
          {session?.status === "pending" && (
            <>
              <p className="mt-2 text-sm text-surface-ink-muted">
                Waiting for the charge point to confirm. Live stats appear within a few seconds.
              </p>
              <div className="mt-4 flex gap-2">
                <Button className="flex-1" onClick={retryPending} disabled={actionLoading} type="button">
                  Retry connection
                </Button>
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={cancelPending}
                  disabled={actionLoading}
                  type="button"
                >
                  Cancel
                </Button>
              </div>
            </>
          )}
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat value={live.powerKw.toFixed(1)} label="kW" />
            <Stat value={`${live.soc.toFixed(0)}%`} label="SoC" />
            <Stat value={`${live.temp.toFixed(0)}°C`} label="Battery" />
            <Stat value={live.energy.toFixed(2)} label="kWh" />
          </div>
          {session?.allocatedKw && (
            <p className="mt-4 text-sm text-surface-ink-muted">
              Allocated power (hub load balance):{" "}
              <span className="font-mono">{session.allocatedKw.toFixed(0)} kW</span>
            </p>
          )}
          {chartData.length > 1 && (
            <div className="mt-6 h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="kW" stroke="#006767" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="soc" stroke="#1a1a1a" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          <Button
            variant="secondary"
            className="mt-6 w-full"
            onClick={stopCharge}
            disabled={actionLoading}
            type="button"
          >
            Stop charging
          </Button>
        </Card>
      ) : (
        <Card>
          <p className="mb-4 text-surface-ink-muted">Plug in your vehicle, then start charging.</p>
          <Button
            className="w-full"
            onClick={startCharge}
            disabled={actionLoading || connector.chargePoint.status === "Offline"}
            type="button"
          >
            {actionLoading ? "Starting…" : "Start charging"}
          </Button>
        </Card>
      )}
    </main>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-lg bg-surface-bg px-3 py-3 text-center">
      <p className="font-mono text-xl font-semibold text-brand-teal">{value}</p>
      <p className="mt-1 text-xs uppercase tracking-wider text-surface-ink-muted">{label}</p>
    </div>
  );
}
