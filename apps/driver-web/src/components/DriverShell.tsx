"use client";

import { AppFooter, AppHeader } from "@st-anthonys/ui";
import { useAuth } from "@/hooks/useAuth";

export function DriverShell({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();

  return (
    <>
      <AppHeader user={user} onSignOut={signOut} />
      <div className="flex-1">{children}</div>
      <AppFooter />
    </>
  );
}
