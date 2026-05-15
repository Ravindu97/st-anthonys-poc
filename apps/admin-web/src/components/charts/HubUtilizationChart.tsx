"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { AdminHubSummary } from "@st-anthonys/shared";

export function HubUtilizationChart({ hubs }: { hubs: AdminHubSummary[] }) {
  if (hubs.length === 0) {
    return <p className="py-8 text-center text-sm text-surface-ink-muted">No hub data.</p>;
  }

  const data = hubs.map((h) => ({
    name: h.city,
    utilization: h.utilizationPercent,
    allocated: Math.round(h.allocatedKw),
    max: h.maxHubKw,
  }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, left: 48, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-surface-border" />
        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} unit="%" />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={80} />
        <Tooltip formatter={(v: number) => [`${v}%`, "Utilization"]} />
        <Bar dataKey="utilization" fill="#0d9488" name="Utilization %" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
