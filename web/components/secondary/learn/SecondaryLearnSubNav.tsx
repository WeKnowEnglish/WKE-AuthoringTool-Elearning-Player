"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  resolveSecondaryLearnSubNavId,
  SECONDARY_LEARN_SUBNAV,
} from "@/lib/secondary/secondary-nav";

/** Words | Practice switcher under the Learn portal section. */
export function SecondaryLearnSubNav() {
  const pathname = usePathname();
  const activeId = resolveSecondaryLearnSubNavId(pathname);

  return (
    <nav
      className="mb-3 flex items-center justify-center gap-1 rounded-full border border-[var(--sec-border)] bg-[var(--sec-card)] p-1"
      aria-label="Learn modes"
    >
      {SECONDARY_LEARN_SUBNAV.map((item) => {
        const active = activeId === item.id;
        return (
          <Link
            key={item.id}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`min-w-[6.5rem] rounded-full px-4 py-1.5 text-center text-sm font-extrabold transition ${
              active
                ? "bg-[var(--sec-accent)] text-white shadow-sm"
                : "text-[var(--sec-muted)] hover:bg-[var(--sec-panel-muted)] hover:text-[var(--sec-ink)]"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
