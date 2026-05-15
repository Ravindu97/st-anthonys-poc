import { cn } from "../lib/cn";

export function Select({
  label,
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string }) {
  return (
    <label className="flex w-full min-w-0 flex-col gap-1 text-sm sm:w-auto">
      {label && <span className="text-xs font-semibold uppercase tracking-wider text-surface-ink-muted">{label}</span>}
      <select
        className={cn(
          "w-full min-w-0 rounded-lg border border-surface-border bg-white px-3 py-2 text-sm text-surface-ink shadow-sm focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/20 sm:w-auto sm:min-w-[8rem]",
          className
        )}
        {...props}
      >
        {children}
      </select>
    </label>
  );
}
