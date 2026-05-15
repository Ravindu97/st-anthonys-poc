export function PageTitle({
  children,
  action,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <h1 className="text-2xl font-bold tracking-tight text-surface-ink">{children}</h1>
      {action}
    </div>
  );
}
