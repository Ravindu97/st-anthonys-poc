"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandLogo } from "./BrandLogo";
import { cn } from "../lib/cn";

const LINKS = [
  { href: "/", label: "Overview" },
  { href: "/charge-points", label: "Charge Points" },
  { href: "/sessions", label: "Sessions" },
  { href: "/hubs", label: "Hub Load" },
] as const;

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-[220px] flex-col bg-brand-teal-light px-4 py-6 text-white">
      <Link href="/" className="mb-6 block text-white no-underline">
        <BrandLogo size={120} />
        <p className="mt-2 text-sm font-semibold tracking-tight">St. Anthony&apos;s Ops</p>
      </Link>

      <nav className="flex flex-1 flex-col gap-1">
        {LINKS.map((link) => {
          const active =
            link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-md px-2 py-2 text-sm transition-colors",
                active
                  ? "bg-white/15 font-semibold text-white"
                  : "text-white/80 hover:bg-white/10 hover:text-white"
              )}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      <Link
        href="/login"
        className="mt-4 rounded-md border border-white/30 px-2 py-2 text-center text-sm text-white/90 hover:bg-white/10"
        onClick={() => {
          if (typeof window !== "undefined") {
            localStorage.removeItem("admin_token");
          }
        }}
      >
        Sign out
      </Link>
    </aside>
  );
}
