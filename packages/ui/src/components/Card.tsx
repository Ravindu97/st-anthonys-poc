import { cn } from "../lib/cn";

export function Card({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200 bg-surface-card p-4 shadow-sm sm:p-5",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
