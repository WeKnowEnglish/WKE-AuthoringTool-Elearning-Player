"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SECONDARY_PORTAL_NAV,
  resolveSecondaryPortalNavId,
} from "@/lib/secondary/secondary-nav";

/** Desktop/tablet header links for Secondary portal. */
export function SecondaryHeaderNav() {
  const pathname = usePathname();
  const activeId = resolveSecondaryPortalNavId(pathname);

  return (
    <nav className="hidden items-center gap-1 sm:flex" aria-label="Secondary">
      {SECONDARY_PORTAL_NAV.map((item) => {
        const active = item.id === activeId;
        return (
          <Link
            key={item.id}
            href={item.href}
            className={`rounded-md px-3 py-2 text-sm font-semibold transition-colors [touch-action:manipulation] ${
              active
                ? "bg-[var(--sec-accent-soft,#ccfbf1)] text-[var(--sec-accent,#0f766e)]"
                : "text-[var(--sec-ink,#1e293b)] hover:bg-[var(--sec-panel-muted,#eef2f7)]"
            }`}
            aria-current={active ? "page" : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Mobile bottom tabs for Secondary portal. */
export function SecondaryMobileNav() {
  const pathname = usePathname();
  const activeId = resolveSecondaryPortalNavId(pathname);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 flex border-t border-[var(--sec-border,#cbd5e1)] bg-[var(--sec-card,#ffffff)] px-2 py-2 sm:hidden"
      aria-label="Secondary mobile"
    >
      {SECONDARY_PORTAL_NAV.map((item) => {
        const active = item.id === activeId;
        return (
          <Link
            key={item.id}
            href={item.href}
            className={`flex min-h-11 flex-1 items-center justify-center rounded-lg text-sm font-extrabold [touch-action:manipulation] ${
              active
                ? "bg-[var(--sec-accent-soft,#ccfbf1)] text-[var(--sec-accent,#0f766e)]"
                : "text-[var(--sec-muted,#64748b)]"
            }`}
            aria-current={active ? "page" : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
