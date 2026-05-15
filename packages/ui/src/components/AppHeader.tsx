"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandLogo } from "./BrandLogo";
import { cn } from "../lib/cn";

export type AppHeaderUser = {
  email: string;
  name?: string | null;
};

type NavItem = { href: string; label: string; external?: boolean };

const BASE_NAV: NavItem[] = [
  { href: "/", label: "STATIONS" },
  { href: "/history", label: "HISTORY" },
  { href: "mailto:support@stanthonys.lk", label: "SUPPORT", external: true },
];

export function AppHeader({
  user,
  onSignOut,
}: {
  user?: AppHeaderUser | null;
  onSignOut?: () => void;
}) {
  const pathname = usePathname();
  const accountHref = user ? "/history" : "/login";
  const accountLabel = user ? "MY ACCOUNT" : "SIGN IN";

  const nav: NavItem[] = [
    ...BASE_NAV.slice(0, 2),
    { href: accountHref, label: accountLabel },
    BASE_NAV[2]!,
  ];

  const displayName = user?.name?.trim() || user?.email?.split("@")[0] || "Account";

  return (
    <header className="bg-brand-teal-light text-white">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-4 px-4 py-3 md:px-6">
        <Link href="/" className="flex items-center gap-3 text-white no-underline">
          <BrandLogo size={44} showWordmark />
        </Link>

        <nav className="flex flex-wrap items-center gap-6 md:gap-8">
          {nav.map((item) => {
            const active =
              !item.external &&
              (item.href === "/" ? pathname === "/" : pathname.startsWith(item.href));
            const className = cn(
              "relative pb-1 text-xs font-semibold uppercase tracking-widest text-white/85 transition-colors hover:text-white",
              active && "text-white after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-brand-amber"
            );
            if (item.external) {
              return (
                <a key={item.label} href={item.href} className={className}>
                  {item.label}
                </a>
              );
            }
            return (
              <Link key={item.label} href={item.href} className={className}>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {user ? (
          <div className="flex items-center gap-2">
            <span className="hidden max-w-[140px] truncate text-xs text-white/90 sm:inline" title={user.email}>
              {displayName}
            </span>
            <button
              type="button"
              onClick={onSignOut}
              className="inline-flex items-center gap-2 rounded-md border-2 border-white/40 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white transition-all duration-200 hover:border-white hover:bg-white/10"
            >
              Sign out
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-md border-2 border-brand-amber px-4 py-2 text-xs font-semibold uppercase tracking-widest text-brand-amber transition-all duration-200 hover:bg-brand-amber/10"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-4 0-7 2-7 4.5V20h14v-1.5C19 16 16 14 12 14Z"
                fill="currentColor"
              />
            </svg>
            Login
          </Link>
        )}
      </div>
    </header>
  );
}
