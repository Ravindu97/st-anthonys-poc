"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AdminTrendBucket } from "@st-anthonys/shared";

export function TrendLineChart({ buckets }: { buckets: AdminTrendBucket[] }) {
  if (buckets.length === 0) {
    return <p className="py-8 text-center text-sm text-surface-ink-muted">No trend data for this range.</p>;
  }

  const data = buckets.map((b) => ({
    date: b.date.slice(5),
    kWh: b.totalKwh,
    revenue: b.totalRevenueLkr,
    sessions: b.sessionCount,
  }));

  return (
    <div className="h-[220px] w-full sm:h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-surface-border" />
        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
        <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
        <Tooltip />
        <Legend />
        <Line yAxisId="left" type="monotone" dataKey="kWh" stroke="#0d9488" strokeWidth={2} dot={false} name="kWh" />
        <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#ca8a04" strokeWidth={2} dot={false} name="Revenue (LKR)" />
      </LineChart>
    </ResponsiveContainer>
    </div>
  );
}
