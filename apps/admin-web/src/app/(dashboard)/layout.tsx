import { AdminSidebar } from "@st-anthonys/ui";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AdminSidebar />
      <main className="min-h-screen bg-surface-bg px-4 pb-6 pt-[4.5rem] sm:px-6 lg:ml-[220px] lg:px-6 lg:pt-6">
        {children}
      </main>
    </>
  );
}
