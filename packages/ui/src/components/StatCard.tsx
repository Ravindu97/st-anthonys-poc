import { Card } from "./Card";
import { cn } from "../lib/cn";

export function StatCard({
  value,
  label,
  className,
  mono = true,
}: {
  value: React.ReactNode;
  label: string;
  className?: string;
  mono?: boolean;
}) {
  return (
    <Card className={cn("p-3 sm:p-4", className)}>
      <p className={cn("text-xl font-bold text-brand-teal sm:text-2xl", mono && "font-mono tracking-tight")}>
        {value}
      </p>
      <p className="mt-1 text-xs text-surface-ink-muted">{label}</p>
    </Card>
  );
}
