"use client";

import { cn } from "@st-anthonys/ui";
import { dateRangePreset } from "@/lib/format";

const PRESETS = [
  { label: "Today", days: 1 },
  { label: "7 days", days: 7 },
  { label: "30 days", days: 30 },
] as const;

export function DateRangePresets({
  from,
  to,
  onChange,
}: {
  from?: string;
  to?: string;
  onChange: (from: string, to: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {PRESETS.map((p) => {
        const range = dateRangePreset(p.days);
        const active = from === range.from && to === range.to;
        return (
          <button
            key={p.label}
            type="button"
            onClick={() => onChange(range.from, range.to)}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors",
              active
                ? "border-brand-teal bg-brand-teal text-white"
                : "border-surface-border bg-white text-surface-ink-muted hover:border-brand-teal"
            )}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
}
