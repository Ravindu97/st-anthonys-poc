import { cn } from "../lib/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-brand-teal text-white hover:bg-brand-teal/90 border border-transparent",
  secondary:
    "border-2 border-brand-teal text-brand-teal bg-white hover:bg-brand-teal/5",
  ghost:
    "border border-surface-border bg-white text-brand-teal hover:bg-surface-bg",
  danger:
    "border-2 border-status-busy text-status-busy bg-white hover:bg-status-busy/5",
};

export function Button({
  variant = "primary",
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold uppercase tracking-widest transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
