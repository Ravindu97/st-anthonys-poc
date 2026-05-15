import { cn } from "../lib/cn";

export function DataTable({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  );
}

export function DataTableHead({ children }: { children: React.ReactNode }) {
  return (
    <thead>
      <tr className="border-b border-surface-border text-left text-xs font-semibold uppercase tracking-wider text-surface-ink-muted">
        {children}
      </tr>
    </thead>
  );
}

export function DataTableBody({ children }: { children: React.ReactNode }) {
  return <tbody className="divide-y divide-surface-border">{children}</tbody>;
}

export function DataTableTh({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <th className={cn("px-3 py-3 font-semibold", className)}>{children}</th>;
}

export function DataTableTd({
  children,
  className,
  mono,
}: {
  children: React.ReactNode;
  className?: string;
  mono?: boolean;
}) {
  return (
    <td className={cn("px-3 py-3 text-surface-ink", mono && "font-mono text-xs", className)}>
      {children}
    </td>
  );
}
