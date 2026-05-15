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
    <Card className={cn("p-4", className)}>
      <p className={cn("text-2xl font-bold text-brand-teal", mono && "font-mono tracking-tight")}>
        {value}
      </p>
      <p className="mt-1 text-xs text-surface-ink-muted">{label}</p>
    </Card>
  );
}
