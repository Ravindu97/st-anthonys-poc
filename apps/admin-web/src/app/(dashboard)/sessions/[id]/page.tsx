"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Banner, Button, Card, PageTitle, StatusBadge } from "@st-anthonys/ui";
import { api } from "@/lib/api";
import { formatDateTime, formatDuration, formatKwh, formatLkr } from "@/lib/format";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { MeterValueChart } from "@/components/charts/MeterValueChart";

type SessionDetail = {
  id: string;
  status: string;
  energyKwh: number;
  costLkr: number;
  syncedFromOffline: boolean;
  startedAt: string | null;
  stoppedAt: string | null;
  allocatedKw: number | null;
  user: { email: string; name: string };
  connector: {
    connectorNum: number;
    chargePoint: { ocppId: string; site: { name: string; city: string } };
  };
  meterValues: Array<{
    timestamp: string;
    powerKw: number;
    energyKwh: number;
    socPercent: number | null;
  }>;
};

export default function SessionDetailPage() {
  useAuthGuard();
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const backQuery = searchParams.toString();
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<{ variant: "success" | "error"; message: string } | null>(null);
  const [stopping, setStopping] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<SessionDetail>(`/sessions/${id}`);
      setSession(data);
    } catch {
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleStop() {
    if (!session || session.status !== "active") return;
    if (!confirm("Stop this active session?")) return;
    setStopping(true);
    try {
      await api(`/sessions/${id}/stop`, { method: "POST" });
      setBanner({ variant: "success", message: "Stop command sent." });
      await load();
    } catch (e) {
      setBanner({ variant: "error", message: e instanceof Error ? e.message : "Failed to stop" });
    } finally {
      setStopping(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-surface-ink-muted">Loading session…</p>;
  }

  if (!session) {
    return (
      <>
        <Link href={`/sessions${backQuery ? `?${backQuery}` : ""}`} className="text-sm text-brand-teal hover:underline">
          ← Back to sessions
        </Link>
        <p className="mt-4 text-surface-ink-muted">Session not found.</p>
      </>
    );
  }

  return (
    <>
      <Link
        href={`/sessions${backQuery ? `?${backQuery}` : ""}`}
        className="mb-4 inline-block text-sm text-brand-teal hover:underline"
      >
        ← Back to sessions
      </Link>
      <PageTitle
        action={
          session.status === "active" ? (
            <Button variant="danger" type="button" onClick={handleStop} disabled={stopping}>
              {stopping ? "Stopping…" : "Stop session"}
            </Button>
          ) : undefined
        }
      >
        Session detail
      </PageTitle>
      {banner && (
        <Banner variant={banner.variant} onDismiss={() => setBanner(null)} className="mb-4">
          {banner.message}
        </Banner>
      )}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wider text-surface-ink-muted">Status</p>
          <div className="mt-2">
            <StatusBadge status={session.status} />
          </div>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wider text-surface-ink-muted">Energy</p>
          <p className="mt-2 font-mono text-lg font-bold">{formatKwh(session.energyKwh)} kWh</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wider text-surface-ink-muted">Cost</p>
          <p className="mt-2 font-mono text-lg font-bold">LKR {formatLkr(session.costLkr)}</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wider text-surface-ink-muted">Duration</p>
          <p className="mt-2 font-mono text-lg font-bold">
            {formatDuration(session.startedAt, session.stoppedAt)}
          </p>
        </Card>
      </div>
      <Card className="mb-6">
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-surface-ink-muted">User</dt>
            <dd className="font-medium">{session.user.name} ({session.user.email})</dd>
          </div>
          <div>
            <dt className="text-surface-ink-muted">Location</dt>
            <dd>
              {session.connector.chargePoint.site.name}, {session.connector.chargePoint.site.city}
            </dd>
          </div>
          <div>
            <dt className="text-surface-ink-muted">Charge point</dt>
            <dd className="font-mono">
              {session.connector.chargePoint.ocppId} · Gun {session.connector.connectorNum}
            </dd>
          </div>
          <div>
            <dt className="text-surface-ink-muted">Started / stopped</dt>
            <dd>
              {formatDateTime(session.startedAt)} → {formatDateTime(session.stoppedAt)}
            </dd>
          </div>
          <div>
            <dt className="text-surface-ink-muted">Allocated kW</dt>
            <dd className="font-mono">{session.allocatedKw?.toFixed(1) ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-surface-ink-muted">Offline sync</dt>
            <dd>{session.syncedFromOffline ? "Yes" : "No"}</dd>
          </div>
        </dl>
      </Card>
      <Card>
        <h3 className="mb-4 font-bold tracking-tight text-surface-ink">Meter values</h3>
        <MeterValueChart meterValues={session.meterValues} />
      </Card>
    </>
  );
}
