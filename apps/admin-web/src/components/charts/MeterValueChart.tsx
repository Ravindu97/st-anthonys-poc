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

type MeterPoint = {
  timestamp: string;
  powerKw: number;
  energyKwh: number;
  socPercent: number | null;
};

export function MeterValueChart({ meterValues }: { meterValues: MeterPoint[] }) {
  if (meterValues.length === 0) {
    return <p className="py-8 text-center text-sm text-surface-ink-muted">No meter values recorded.</p>;
  }

  const data = meterValues.map((m, i) => ({
    t: i,
    time: new Date(m.timestamp).toLocaleTimeString(),
    power: m.powerKw,
    energy: m.energyKwh,
    soc: m.socPercent ?? undefined,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h4 className="mb-2 text-sm font-semibold text-surface-ink">Power (kW)</h4>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Line type="monotone" dataKey="power" stroke="#0d9488" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      {data.some((d) => d.soc !== undefined) && (
        <div>
          <h4 className="mb-2 text-sm font-semibold text-surface-ink">State of charge (%)</h4>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="soc" stroke="#ca8a04" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      <div>
        <h4 className="mb-2 text-sm font-semibold text-surface-ink">Energy (kWh)</h4>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="energy" stroke="#6366f1" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
