import { cn } from "../lib/cn";

export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <tbody className="divide-y divide-surface-border">
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i}>
          {Array.from({ length: cols }).map((__, j) => (
            <td key={j} className="px-3 py-3">
              <div
                className={cn(
                  "h-4 animate-pulse rounded bg-surface-border",
                  j === 0 ? "w-3/4" : "w-full"
                )}
              />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}
