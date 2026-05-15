import { cn } from "../lib/cn";
import { statusLabel, statusToVariant, type StatusVariant } from "../lib/status";

const styles: Record<StatusVariant, string> = {
  available: "text-status-available bg-status-available/10",
  busy: "text-status-busy bg-status-busy/10",
  offline: "text-status-offline bg-status-offline/10",
  maintenance: "text-surface-ink-muted bg-surface-ink-muted/10",
};

export function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const variant = statusToVariant(status);
  return (
    <span
      className={cn(
        "inline-block rounded px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wide",
        styles[variant],
        className
      )}
    >
      [{statusLabel(status)}]
    </span>
  );
}
