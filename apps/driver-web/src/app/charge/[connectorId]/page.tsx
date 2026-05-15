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
      const active = await api<Session | null>("/sessions/active");
      if (active && active.status !== "completed") {
        setSession(active);
        sessionIdRef.current = active.id;
        syncLiveFromSession(active);
      }
    } catch {
      /* no active session */
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
    const unsub = subscribeEvents((channel, data) => {
      const d = data as { sessionId?: string; powerKw?: number; socPercent?: number; batteryTempC?: number; energyKwh?: number; costLkr?: number; status?: string };
      if (channel === "session:update" && session && d.sessionId === session.id) {
        setLive((prev) => ({
          powerKw: d.powerKw ?? prev.powerKw,
          soc: d.socPercent ?? prev.soc,
          temp: d.batteryTempC ?? prev.temp,
          energy: d.energyKwh ?? prev.energy,
          cost: d.costLkr ?? prev.cost,
        }));
        if (d.status === "completed") refresh();
      }
    });
    return unsub;
  }, [session, refresh]);

  useEffect(() => {
    if (!session) return;
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [session, refresh]);

  async function startCharge() {
    setActionLoading(true);
    try {
      await api("/sessions/start", {
        method: "POST",
        body: JSON.stringify({ connectorId }),
      });
      await refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to start");
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

  if (loading) return <main className="container">Loading…</main>;
  if (!connector) return <main className="container">Connector not found</main>;

  const isActive = session?.status === "active" || session?.status === "pending";
  const chartData = (session?.meterValues ?? []).map((mv) => ({
    time: new Date(mv.timestamp).toLocaleTimeString(),
    kW: mv.powerKw,
    soc: mv.socPercent ?? 0,
  }));

  return (
    <main className="container">
      <div className="card">
        <h2>{connector.site.name}</h2>
        <p>
          {connector.chargePoint.ocppId} · Gun {connector.connectorNum} · {connector.chargePoint.model}
        </p>
        <p>LKR {connector.tariffLkrPerKwh}/kWh</p>
        <span className={`badge badge-${connector.status.toLowerCase()}`}>{connector.status}</span>
        {session?.syncedFromOffline && (
          <span className="badge" style={{ marginLeft: 8, background: "#cce5ff" }}>
            Synced from offline
          </span>
        )}
      </div>

      {isActive ? (
        <div className="card">
          <h3>Charging in progress</h3>
          <div className="stat-grid">
            <div className="stat">
              <div className="stat-value">{live.powerKw.toFixed(1)}</div>
              <div className="stat-label">kW</div>
            </div>
            <div className="stat">
              <div className="stat-value">{live.soc.toFixed(0)}%</div>
              <div className="stat-label">SoC</div>
            </div>
            <div className="stat">
              <div className="stat-value">{live.temp.toFixed(0)}°C</div>
              <div className="stat-label">Battery</div>
            </div>
            <div className="stat">
              <div className="stat-value">{live.energy.toFixed(2)}</div>
              <div className="stat-label">kWh</div>
            </div>
          </div>
          {session?.allocatedKw && (
            <p style={{ fontSize: "0.875rem", color: "#666" }}>
              Allocated power (hub load balance): {session.allocatedKw.toFixed(0)} kW
            </p>
          )}
          {chartData.length > 1 && (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line type="monotone" dataKey="kW" stroke="#00a86b" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="soc" stroke="#0a2540" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
          <button
            className="btn btn-secondary"
            onClick={stopCharge}
            disabled={actionLoading}
            style={{ width: "100%", marginTop: "1rem" }}
          >
            Stop charging
          </button>
        </div>
      ) : (
        <div className="card">
          <p style={{ marginBottom: "1rem" }}>Plug in your vehicle, then start charging.</p>
          <button
            className="btn btn-primary"
            onClick={startCharge}
            disabled={actionLoading || connector.chargePoint.status === "Offline"}
            style={{ width: "100%" }}
          >
            {actionLoading ? "Starting…" : "Start charging"}
          </button>
        </div>
      )}
    </main>
  );
}
