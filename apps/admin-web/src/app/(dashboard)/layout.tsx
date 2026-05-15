import { AdminSidebar } from "@st-anthonys/ui";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AdminSidebar />
      <main className="ml-[220px] min-h-screen bg-surface-bg p-6">{children}</main>
    </>
  );
}
