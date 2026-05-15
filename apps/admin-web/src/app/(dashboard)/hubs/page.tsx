"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, PageTitle } from "@st-anthonys/ui";
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
      <PageTitle>Hub load balancing</PageTitle>
      <div className="space-y-4">
        {hubs.map((hub) => (
          <Card key={hub.id}>
            <h3 className="text-lg font-bold tracking-tight">{hub.siteName}</h3>
            <p className="text-sm text-surface-ink-muted">
              {hub.city} · {hub.activeSessions} active session(s)
            </p>
            <p className="mt-2 font-mono text-sm">
              {hub.allocatedKw.toFixed(0)} / {hub.maxHubKw} kW ({hub.utilizationPercent}%)
            </p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-border">
              <div
                className="h-full rounded-full bg-brand-teal transition-all duration-300"
                style={{ width: `${Math.min(100, hub.utilizationPercent)}%` }}
              />
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
