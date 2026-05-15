"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { api } from "@/lib/api";

type Site = {
  id: string;
  name: string;
  city: string;
  address: string;
  latitude: number;
  longitude: number;
  tariffLkrPerKwh: number;
  chargePoints: Array<{
    id: string;
    ocppId: string;
    model: string;
    maxKw: number;
    status: string;
    connectors: Array<{ id: string; connectorNum: number; status: string; qrUrl: string }>;
  }>;
};

const StationMap = dynamic(() => import("@/components/StationMap"), { ssr: false });

export default function HomePage() {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<Site[]>("/sites")
      .then(setSites)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <main className="container">Loading stations…</main>;

  return (
    <main className="container">
      <h2 style={{ marginBottom: "1rem" }}>Find a charger</h2>
      <StationMap sites={sites} />
      {sites.map((site) => (
        <div key={site.id} className="card">
          <h3>{site.name}</h3>
          <p style={{ color: "#666", fontSize: "0.875rem" }}>
            {site.address} · LKR {site.tariffLkrPerKwh}/kWh
          </p>
          {site.chargePoints.map((cp) => (
            <div key={cp.id} style={{ marginTop: "0.75rem" }}>
              <strong>{cp.ocppId}</strong> — {cp.model} ({cp.maxKw} kW)
              <span className={`badge badge-${cp.status.toLowerCase()}`} style={{ marginLeft: 8 }}>
                {cp.status}
              </span>
              <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                {cp.connectors.map((c) => (
                  <a key={c.id} href={`/charge/${c.id}`} className="btn btn-secondary" style={{ fontSize: 14 }}>
                    Gun {c.connectorNum} — {c.status}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}
    </main>
  );
}
