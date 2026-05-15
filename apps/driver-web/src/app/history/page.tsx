"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
    <main className="container">
      <h2 style={{ marginBottom: "1rem" }}>Charging history</h2>
      {sessions.length === 0 && <p>No completed sessions yet.</p>}
      {sessions.map((s) => (
        <div key={s.id} className="card">
          <strong>{s.connector.chargePoint.ocppId}</strong> Gun {s.connector.connectorNum}
          <p>
            {s.energyKwh.toFixed(2)} kWh · LKR {s.costLkr.toFixed(0)}
            {s.syncedFromOffline && (
              <span className="badge" style={{ marginLeft: 8 }}>
                Offline sync
              </span>
            )}
          </p>
          <p style={{ fontSize: "0.875rem", color: "#666" }}>
            {s.stoppedAt ? new Date(s.stoppedAt).toLocaleString() : ""}
          </p>
          <a href={`/receipt/${s.id}`} className="btn btn-secondary" style={{ marginTop: 8, fontSize: 14 }}>
            View receipt
          </a>
        </div>
      ))}
    </main>
  );
}
