"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { api, getToken } from "@/lib/api";

type ChargePoint = {
  id: string;
  ocppId: string;
  model: string;
  maxKw: number;
  status: string;
  lastHeartbeat: string | null;
  site: { name: string; city: string };
  connectors: Array<{ connectorNum: number; status: string }>;
};

export default function ChargePointsPage() {
  const router = useRouter();
  const [points, setPoints] = useState<ChargePoint[]>([]);

  useEffect(() => {
    if (!getToken()) {
      router.push("/login");
      return;
    }
    api<ChargePoint[]>("/admin/charge-points").then(setPoints).catch(() => router.push("/login"));
  }, [router]);

  async function handleReset(ocppId: string) {
    await api(`/admin/charge-points/${ocppId}/reset`, { method: "POST", body: JSON.stringify({ type: "Soft" }) });
    alert(`Reset sent to ${ocppId}`);
  }

  return (
    <>
      <Sidebar />
      <main className="main">
        <h2 style={{ marginBottom: "1rem" }}>Charge points</h2>
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>OCPP ID</th>
                <th>Site</th>
                <th>Model</th>
                <th>Status</th>
                <th>Last heartbeat</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {points.map((cp) => (
                <tr key={cp.id}>
                  <td>{cp.ocppId}</td>
                  <td>{cp.site.city}</td>
                  <td>{cp.model} ({cp.maxKw} kW)</td>
                  <td className={cp.status === "Offline" ? "badge-offline" : "badge-online"}>{cp.status}</td>
                  <td>{cp.lastHeartbeat ? new Date(cp.lastHeartbeat).toLocaleString() : "—"}</td>
                  <td>
                    <button className="btn btn-danger" onClick={() => handleReset(cp.ocppId)}>
                      Reset
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
