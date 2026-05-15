export function FilterBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-end">
      {children}
    </div>
  );
}
