import { cn } from "../lib/cn";

type BannerVariant = "success" | "error" | "info";

const variants: Record<BannerVariant, string> = {
  success: "border-status-available/30 bg-status-available/10 text-status-available",
  error: "border-status-busy/30 bg-status-busy/10 text-status-busy",
  info: "border-brand-teal/30 bg-brand-teal/5 text-brand-teal",
};

export function Banner({
  variant = "info",
  children,
  onDismiss,
  className,
}: {
  variant?: BannerVariant;
  children: React.ReactNode;
  onDismiss?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm",
        variants[variant],
        className
      )}
      role="status"
    >
      <span>{children}</span>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 text-xs font-semibold uppercase tracking-wider opacity-70 hover:opacity-100"
        >
          Dismiss
        </button>
      )}
    </div>
  );
}
