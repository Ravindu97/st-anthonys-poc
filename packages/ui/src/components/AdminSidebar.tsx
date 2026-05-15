"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BrandLogo } from "./BrandLogo";
import { cn } from "../lib/cn";

const LINKS = [
  { href: "/", label: "Overview" },
  { href: "/charge-points", label: "Charge Points" },
  { href: "/sessions", label: "Sessions" },
  { href: "/hubs", label: "Hub Load" },
] as const;

const SIDEBAR_WIDTH = 220;

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
    >
      {open ? (
        <>
          <path d="M6 6l12 12M18 6L6 18" />
        </>
      ) : (
        <>
          <path d="M4 7h16M4 12h16M4 17h16" />
        </>
      )}
    </svg>
  );
}

function NavLinks({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <>
      {LINKS.map((link) => {
        const active =
          link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={onNavigate}
            className={cn(
              "rounded-md px-3 py-2.5 text-sm transition-colors",
              active
                ? "bg-white/15 font-semibold text-white"
                : "text-white/80 hover:bg-white/10 hover:text-white"
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </>
  );
}

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  function closeMenu() {
    setOpen(false);
  }

  function handleSignOut() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("admin_token");
    }
    closeMenu();
    router.replace("/login");
  }

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 flex h-14 items-center gap-3 border-b border-white/10 bg-brand-teal-light px-4 text-white lg:hidden">
        <button
          type="button"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md hover:bg-white/10"
          aria-expanded={open}
          aria-controls="admin-sidebar"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          <MenuIcon open={open} />
        </button>
        <Link href="/" className="flex min-w-0 flex-1 items-center gap-2 no-underline" onClick={closeMenu}>
          <BrandLogo size={36} />
          <span className="truncate text-sm font-semibold tracking-tight">St. Anthony&apos;s Ops</span>
        </Link>
      </header>

      {open && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          aria-label="Close menu"
          onClick={closeMenu}
        />
      )}

      <aside
        id="admin-sidebar"
        style={{ width: SIDEBAR_WIDTH }}
        className={cn(
          "fixed left-0 top-0 z-50 flex h-screen flex-col bg-brand-teal-light px-4 py-6 text-white transition-transform duration-200 ease-out lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="mb-6 hidden lg:block">
          <Link href="/" className="block text-white no-underline">
            <BrandLogo size={120} />
            <p className="mt-2 text-sm font-semibold tracking-tight">St. Anthony&apos;s Ops</p>
          </Link>
        </div>

        <div className="mb-4 flex items-center justify-between lg:hidden">
          <p className="text-sm font-semibold tracking-tight">Menu</p>
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-white/10"
            aria-label="Close menu"
            onClick={closeMenu}
          >
            <MenuIcon open />
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
          <NavLinks pathname={pathname} onNavigate={closeMenu} />
        </nav>

        <button
          type="button"
          className="mt-4 w-full rounded-md border border-white/30 px-3 py-2.5 text-center text-sm text-white/90 hover:bg-white/10"
          onClick={handleSignOut}
        >
          Sign out
        </button>
      </aside>
    </>
  );
}
