"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { AdminFleetByCity } from "@st-anthonys/shared";

export function StatusBarChart({ data }: { data: AdminFleetByCity[] }) {
  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-surface-ink-muted">No fleet data.</p>;
  }

  return (
    <div className="h-[220px] w-full sm:h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-surface-border" />
        <XAxis dataKey="city" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
        <Tooltip />
        <Legend />
        <Bar dataKey="available" stackId="a" fill="#22c55e" name="Available" />
        <Bar dataKey="charging" stackId="a" fill="#0d9488" name="Charging" />
        <Bar dataKey="faulted" stackId="a" fill="#ef4444" name="Faulted" />
        <Bar dataKey="offline" stackId="a" fill="#94a3b8" name="Offline" />
        <Bar dataKey="unavailable" stackId="a" fill="#f59e0b" name="Unavailable" />
      </BarChart>
    </ResponsiveContainer>
    </div>
  );
}
