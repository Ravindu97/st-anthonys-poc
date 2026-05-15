"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, PageTitle, StatCard } from "@st-anthonys/ui";
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
      <PageTitle>Network overview</PageTitle>
      {overview && (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard
            value={`${overview.onlineChargePoints}/${overview.totalChargePoints}`}
            label="Charge points online"
          />
          <StatCard value={overview.activeSessions} label="Active sessions" />
          <StatCard value={overview.todayKwh} label="kWh delivered today" />
          <StatCard value={`LKR ${overview.todayRevenueLkr}`} label="Revenue today (stub)" />
          <StatCard value={overview.faultedChargePoints} label="Faulted units" />
        </div>
      )}
      <Card>
        <h3 className="font-bold tracking-tight text-surface-ink">Quick links</h3>
        <p className="mt-2 text-sm text-surface-ink-muted">
          Monitor fleet health, hub load balancing, and session logs across Panadura, Colombo, and
          Kurunegala.
        </p>
      </Card>
    </>
  );
}
