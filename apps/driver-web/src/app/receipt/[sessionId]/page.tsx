"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
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

  if (!session) return <main className="container">Loading receipt…</main>;

  const receipt = session.transaction?.receipt;

  return (
    <main className="container">
      <div className="card" style={{ textAlign: "center" }}>
        <h2>Receipt</h2>
        <p style={{ color: "var(--sa-green)", fontSize: "2rem", fontWeight: 700 }}>
          LKR {session.costLkr.toFixed(0)}
        </p>
        <p>St. Anthony&apos;s Energy</p>
        <hr style={{ margin: "1rem 0", border: "none", borderTop: "1px solid var(--sa-border)" }} />
        <p>
          <strong>{session.connector.chargePoint.ocppId}</strong> · Gun {session.connector.connectorNum}
        </p>
        <p>{session.energyKwh.toFixed(2)} kWh delivered</p>
        <p style={{ fontSize: "0.875rem", color: "#666" }}>
          {session.startedAt && new Date(session.startedAt).toLocaleString()} —{" "}
          {session.stoppedAt && new Date(session.stoppedAt).toLocaleString()}
        </p>
        {receipt && (
          <p style={{ fontSize: "0.875rem" }}>
            Paid via {receipt.paymentMethod}
            {receipt.note && <br />}
            {receipt.note}
          </p>
        )}
        {session.syncedFromOffline && (
          <p className="badge" style={{ marginTop: "1rem" }}>
            Synced from offline buffer
          </p>
        )}
        <a href="/" className="btn btn-primary" style={{ marginTop: "1.5rem", display: "inline-block" }}>
          Back to stations
        </a>
      </div>
    </main>
  );
}
