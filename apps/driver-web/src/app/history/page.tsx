"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Card, PageTitle } from "@st-anthonys/ui";
import { api, getToken } from "@/lib/api";

type Session = {
  id: string;
  energyKwh: number;
  costLkr: number;
  stoppedAt: string;
  syncedFromOffline: boolean;
  connector: { chargePoint: { ocppId: string }; connectorNum: number };
};

export default function HistoryPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => {
    if (!getToken()) {
      router.push("/login");
      return;
    }
    api<Session[]>("/sessions/history").then(setSessions).catch(console.error);
  }, [router]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 md:px-6">
      <PageTitle>Charging history</PageTitle>
      {sessions.length === 0 && (
        <p className="text-sm text-surface-ink-muted">No completed sessions yet.</p>
      )}
      <div className="space-y-4">
        {sessions.map((s) => (
          <Card key={s.id}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-mono text-sm font-medium text-surface-ink">
                  {s.connector.chargePoint.ocppId}
                </p>
                <p className="text-sm text-surface-ink-muted">Gun {s.connector.connectorNum}</p>
              </div>
              <div className="text-right">
                <p className="font-mono text-lg font-semibold text-brand-teal">
                  {s.energyKwh.toFixed(2)} kWh
                </p>
                <p className="font-mono text-sm text-surface-ink-muted">
                  LKR {s.costLkr.toFixed(0)}
                </p>
              </div>
            </div>
            <p className="mt-2 font-mono text-xs text-surface-ink-muted">
              {new Date(s.stoppedAt).toLocaleString()}
            </p>
            {s.syncedFromOffline && (
              <span className="mt-2 inline-block rounded bg-brand-teal/10 px-2 py-0.5 font-mono text-[10px] uppercase text-brand-teal">
                Offline sync
              </span>
            )}
            <Link href={`/receipt/${s.id}`} className="mt-4 block">
              <Button variant="secondary" className="w-full sm:w-auto" type="button">
                View receipt
              </Button>
            </Link>
          </Card>
        ))}
      </div>
    </main>
  );
}
