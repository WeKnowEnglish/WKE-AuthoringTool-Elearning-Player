"use client";

import { clsx } from "clsx";
import { useMemo } from "react";
import { evaluateCollectionBadges } from "@/lib/collection-badges";

export function BadgeGrid() {
  const badges = useMemo(() => evaluateCollectionBadges(), []);

  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-2">
      {badges.map(({ def, earned }) => (
        <li
          key={def.id}
          className={clsx(
            "flex flex-col items-center rounded-2xl border-4 p-3 text-center",
            earned ?
              "border-kid-ink bg-amber-50 shadow-[3px_3px_0_#0a2f86]"
            : "border-kid-ink/25 bg-neutral-100/90 opacity-80",
          )}
        >
          <span className={clsx("text-4xl", !earned && "grayscale")} aria-hidden>
            {def.emoji}
          </span>
          <p className="mt-2 text-sm font-extrabold text-kid-ink">{def.label}</p>
          <p className="mt-1 text-xs font-semibold leading-snug text-kid-ink/75">
            {def.description}
          </p>
          <p className="mt-2 text-[10px] font-extrabold uppercase tracking-wide text-kid-ink/60">
            {earned ? "Earned" : "Locked"}
          </p>
        </li>
      ))}
    </ul>
  );
}
