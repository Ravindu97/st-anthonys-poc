export function PageTitle({
  children,
  action,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4">
      <h1 className="text-xl font-bold tracking-tight text-surface-ink sm:text-2xl">{children}</h1>
      {action ? <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">{action}</div> : null}
    </div>
  );
}
