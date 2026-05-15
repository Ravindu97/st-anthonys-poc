"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { api, getToken, subscribeEvents } from "@/lib/api";

type Overview = {
  totalChargePoints: number;
  onlineChargePoints: number;
  offlineChargePoints: number;
  activeSessions: number;
  todayKwh: number;
  todayRevenueLkr: number;
  faultedChargePoints: number;
};

export default function AdminOverviewPage() {
  const router = useRouter();
  const [overview, setOverview] = useState<Overview | null>(null);

  useEffect(() => {
    if (!getToken()) {
      router.push("/login");
      return;
    }
    api<Overview>("/admin/overview").then(setOverview).catch(() => router.push("/login"));
    const unsub = subscribeEvents(() => {
      api<Overview>("/admin/overview").then(setOverview).catch(console.error);
    });
    return unsub;
  }, [router]);

  return (
    <>
      <Sidebar />
      <main className="main">
        <h2 style={{ marginBottom: "1rem" }}>Network overview</h2>
        {overview && (
          <div className="stat-row">
            <div className="stat-card">
              <h3>{overview.onlineChargePoints}/{overview.totalChargePoints}</h3>
              <p>Charge points online</p>
            </div>
            <div className="stat-card">
              <h3>{overview.activeSessions}</h3>
              <p>Active sessions</p>
            </div>
            <div className="stat-card">
              <h3>{overview.todayKwh}</h3>
              <p>kWh delivered today</p>
            </div>
            <div className="stat-card">
              <h3>LKR {overview.todayRevenueLkr}</h3>
              <p>Revenue today (stub)</p>
            </div>
            <div className="stat-card">
              <h3>{overview.faultedChargePoints}</h3>
              <p>Faulted units</p>
            </div>
          </div>
        )}
        <div className="card">
          <h3>Quick links</h3>
          <p style={{ marginTop: "0.5rem", fontSize: "0.875rem" }}>
            Monitor fleet health, hub load balancing, and session logs across Panadura, Colombo, and Kurunegala.
          </p>
        </div>
      </main>
    </>
  );
}
