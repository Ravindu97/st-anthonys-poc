"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { api, getToken, subscribeEvents } from "@/lib/api";

type Hub = {
  id: string;
  name: string;
  siteName: string;
  city: string;
  maxHubKw: number;
  allocatedKw: number;
  utilizationPercent: number;
  activeSessions: number;
};

export default function HubsPage() {
  const router = useRouter();
  const [hubs, setHubs] = useState<Hub[]>([]);

  const load = () => api<Hub[]>("/admin/hubs").then(setHubs).catch(() => router.push("/login"));

  useEffect(() => {
    if (!getToken()) {
      router.push("/login");
      return;
    }
    load();
    const unsub = subscribeEvents((ch) => {
      if (ch === "hub:load") load();
    });
    return unsub;
  }, [router]);

  return (
    <>
      <Sidebar />
      <main className="main">
        <h2 style={{ marginBottom: "1rem" }}>Hub load balancing</h2>
        {hubs.map((hub) => (
          <div key={hub.id} className="card">
            <h3>{hub.siteName}</h3>
            <p style={{ fontSize: "0.875rem", color: "#666" }}>
              {hub.city} · {hub.activeSessions} active session(s)
            </p>
            <p>
              {hub.allocatedKw.toFixed(0)} / {hub.maxHubKw} kW ({hub.utilizationPercent}%)
            </p>
            <div className="bar-track">
              <div className="bar-fill" style={{ width: `${Math.min(100, hub.utilizationPercent)}%` }} />
            </div>
          </div>
        ))}
      </main>
    </>
  );
}
