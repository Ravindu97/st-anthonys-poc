import { cn } from "../lib/cn";

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full rounded-lg border border-surface-border bg-white px-3 py-2.5 text-sm text-surface-ink shadow-sm transition-all duration-200 placeholder:text-surface-ink-muted focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/20",
        className
      )}
      {...props}
    />
  );
}
