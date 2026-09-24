"use client";

import { Check, LockKeyhole, Search } from "lucide-react";
import { clsx } from "clsx";
import type { MysteryHotspotDefinition } from "@/lib/mystery/types";

type MysteryHotspotProps = {
  hotspot: MysteryHotspotDefinition;
  available: boolean;
  inspected: boolean;
  onActivate: (hotspotId: string) => void;
};

/** Accessible percentage-positioned target that scales with its scene. */
export function MysteryHotspot({
  hotspot,
  available,
  inspected,
  onActivate,
}: MysteryHotspotProps) {
  return (
    <button
      type="button"
      disabled={!available}
      aria-label={(inspected ? "Review " : "Inspect ") + hotspot.label}
      title={hotspot.label}
      onClick={() => onActivate(hotspot.id)}
      className={clsx(
        "group absolute rounded-xl border-2 border-transparent outline-none transition",
        "focus-visible:border-white focus-visible:ring-4 focus-visible:ring-amber-300",
        available && "cursor-pointer hover:border-white/90 hover:bg-white/10",
        !available && "cursor-not-allowed",
      )}
      style={{
        left: hotspot.area.x + "%",
        top: hotspot.area.y + "%",
        width: hotspot.area.width + "%",
        height: hotspot.area.height + "%",
      }}
    >
      <span
        className={clsx(
          "absolute left-1/2 top-1/2 flex size-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-[3px] shadow-lg sm:size-11",
          inspected
            ? "border-emerald-900 bg-emerald-400 text-emerald-950"
            : available
              ? "border-kid-ink bg-kid-cta text-kid-ink group-hover:scale-110"
              : "border-slate-700 bg-slate-200 text-slate-600",
        )}
      >
        {inspected ? (
          <Check aria-hidden className="size-5 stroke-[3]" />
        ) : available ? (
          <Search aria-hidden className="size-5 stroke-[3]" />
        ) : (
          <LockKeyhole aria-hidden className="size-4" />
        )}
      </span>
      <span className="sr-only">{hotspot.label}</span>
    </button>
  );
}
