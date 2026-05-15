"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { api, getToken } from "@/lib/api";

type Session = {
  id: string;
  status: string;
  energyKwh: number;
  costLkr: number;
  syncedFromOffline: boolean;
  startedAt: string | null;
  stoppedAt: string | null;
  user: { email: string; name: string };
  connector: { connectorNum: number; chargePoint: { ocppId: string; site: { city: string } } };
};

export default function SessionsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => {
    if (!getToken()) {
      router.push("/login");
      return;
    }
    api<Session[]>("/admin/sessions").then(setSessions).catch(() => router.push("/login"));
  }, [router]);

  function exportCsv() {
    const headers = ["ID", "User", "Site", "ChargePoint", "Status", "kWh", "LKR", "Offline Sync"];
    const rows = sessions.map((s) =>
      [
        s.id,
        s.user.email,
        s.connector.chargePoint.site.city,
        s.connector.chargePoint.ocppId,
        s.status,
        s.energyKwh,
        s.costLkr,
        s.syncedFromOffline,
      ].join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sessions.csv";
    a.click();
  }

  return (
    <>
      <Sidebar />
      <main className="main">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h2>Sessions</h2>
          <button className="btn" onClick={exportCsv}>
            Export CSV
          </button>
        </div>
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Location</th>
                <th>Status</th>
                <th>kWh</th>
                <th>LKR</th>
                <th>Offline</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.id}>
                  <td>{s.user.name}</td>
                  <td>
                    {s.connector.chargePoint.site.city} · {s.connector.chargePoint.ocppId} G{s.connector.connectorNum}
                  </td>
                  <td>{s.status}</td>
                  <td>{s.energyKwh.toFixed(2)}</td>
                  <td>{s.costLkr.toFixed(0)}</td>
                  <td>{s.syncedFromOffline ? "Yes" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
