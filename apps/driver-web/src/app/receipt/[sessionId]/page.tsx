"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button, Card } from "@st-anthonys/ui";
import { api, getToken } from "@/lib/api";

type Session = {
  id: string;
  energyKwh: number;
  costLkr: number;
  stoppedAt: string;
  startedAt: string;
  syncedFromOffline: boolean;
  connector: {
    connectorNum: number;
    chargePoint: { ocppId: string; model: string };
    site?: { name: string; city: string };
  };
  transaction?: {
    receipt: {
      paymentMethod: string;
      paidAt: string;
      note?: string;
    };
  };
};

export default function ReceiptPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    if (!getToken()) return;
    api<Session>(`/sessions/${sessionId}`).then(setSession).catch(console.error);
  }, [sessionId]);

  if (!session) {
    return (
      <main className="mx-auto max-w-md px-4 py-12 text-center text-surface-ink-muted">
        Loading receipt…
      </main>
    );
  }

  const receipt = session.transaction?.receipt;

  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <Card className="text-center">
        <h2 className="text-xl font-bold tracking-tight">Receipt</h2>
        <p className="mt-4 font-mono text-4xl font-bold text-brand-teal">
          LKR {session.costLkr.toFixed(0)}
        </p>
        <p className="mt-1 text-sm text-surface-ink-muted">St. Anthony&apos;s Energy</p>
        <hr className="my-6 border-surface-border" />
        <p className="font-mono text-sm">
          <strong>{session.connector.chargePoint.ocppId}</strong> · Gun{" "}
          {session.connector.connectorNum}
        </p>
        <p className="mt-2 font-mono text-sm text-surface-ink">
          {session.energyKwh.toFixed(2)} kWh delivered
        </p>
        <p className="mt-2 font-mono text-xs text-surface-ink-muted">
          {session.startedAt && new Date(session.startedAt).toLocaleString()} —{" "}
          {session.stoppedAt && new Date(session.stoppedAt).toLocaleString()}
        </p>
        {receipt && (
          <p className="mt-3 text-sm text-surface-ink-muted">
            Paid via {receipt.paymentMethod}
            {receipt.note && (
              <>
                <br />
                {receipt.note}
              </>
            )}
          </p>
        )}
        {session.syncedFromOffline && (
          <span className="mt-4 inline-block rounded bg-brand-teal/10 px-2 py-0.5 font-mono text-[10px] uppercase text-brand-teal">
            Synced from offline buffer
          </span>
        )}
        <Link href="/" className="mt-8 block">
          <Button className="w-full" type="button">
            Back to stations
          </Button>
        </Link>
      </Card>
    </main>
  );
}
