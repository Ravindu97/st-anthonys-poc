import { Button } from "./Button";

export function EmptyState({
  title = "No results",
  description,
  onClearFilters,
}: {
  title?: string;
  description?: string;
  onClearFilters?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <p className="text-lg font-semibold text-surface-ink">{title}</p>
      {description && <p className="max-w-md text-sm text-surface-ink-muted">{description}</p>}
      {onClearFilters && (
        <Button variant="ghost" type="button" onClick={onClearFilters}>
          Clear filters
        </Button>
      )}
    </div>
  );
}
