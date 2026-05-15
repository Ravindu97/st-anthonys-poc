import { cn } from "../lib/cn";
import { Input } from "./Input";

export function TableToolbar({
  search,
  onSearchChange,
  searchPlaceholder = "Search…",
  filters,
  actions,
  className,
}: {
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  filters?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3 border-b border-surface-border p-4", className)}>
      <div className="flex flex-wrap items-end gap-3">
        {onSearchChange !== undefined && (
          <div className="min-w-[200px] flex-1">
            <Input
              type="search"
              placeholder={searchPlaceholder}
              value={search ?? ""}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
        )}
        {filters}
        {actions && <div className="ml-auto flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
