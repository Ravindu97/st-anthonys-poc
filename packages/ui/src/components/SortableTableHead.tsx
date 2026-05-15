import { cn } from "../lib/cn";
import { DataTableTh } from "./DataTable";

export function SortableTableHead({
  label,
  sortKey,
  currentSortBy,
  currentSortOrder,
  onSort,
  className,
}: {
  label: string;
  sortKey: string;
  currentSortBy?: string;
  currentSortOrder?: "asc" | "desc";
  onSort: (key: string) => void;
  className?: string;
}) {
  const active = currentSortBy === sortKey;
  const indicator = active ? (currentSortOrder === "asc" ? " ↑" : " ↓") : "";

  return (
    <DataTableTh className={className}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          "inline-flex items-center gap-1 hover:text-brand-teal",
          active && "text-brand-teal"
        )}
      >
        {label}
        <span className="font-mono text-xs">{indicator}</span>
      </button>
    </DataTableTh>
  );
}
