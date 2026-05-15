import { cn } from "../lib/cn";

export function DataTable({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("-mx-px overflow-x-auto overscroll-x-contain", className)}>
      <table className="w-full min-w-[640px] border-collapse text-sm">{children}</table>
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
  return <th className={cn("whitespace-nowrap px-2 py-2.5 font-semibold sm:px-3 sm:py-3", className)}>{children}</th>;
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
    <td className={cn("px-2 py-2.5 text-surface-ink sm:px-3 sm:py-3", mono && "font-mono text-xs", className)}>
      {children}
    </td>
  );
}
