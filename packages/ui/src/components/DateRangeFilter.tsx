import { Input } from "./Input";

export function DateRangeFilter({
  from,
  to,
  onFromChange,
  onToChange,
}: {
  from?: string;
  to?: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
}) {
  return (
    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-end">
      <label className="flex w-full min-w-0 flex-col gap-1 text-sm sm:w-auto">
        <span className="text-xs font-semibold uppercase tracking-wider text-surface-ink-muted">From</span>
        <Input type="date" value={from ?? ""} onChange={(e) => onFromChange(e.target.value)} />
      </label>
      <label className="flex w-full min-w-0 flex-col gap-1 text-sm sm:w-auto">
        <span className="text-xs font-semibold uppercase tracking-wider text-surface-ink-muted">To</span>
        <Input type="date" value={to ?? ""} onChange={(e) => onToChange(e.target.value)} />
      </label>
    </div>
  );
}
