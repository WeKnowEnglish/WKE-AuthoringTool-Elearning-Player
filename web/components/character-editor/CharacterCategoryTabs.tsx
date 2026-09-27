"use client";

import { clsx } from "clsx";
import {
  WKE_GIRL_CUSTOMIZATION_CATEGORIES,
  type WkeGirlCustomizationCategory,
} from "@/lib/character/wke-girl-assets";

const LABELS: Record<WkeGirlCustomizationCategory, string> = {
  hair: "Hair",
  outfit: "Outfit",
  skin: "Skin",
};

type Props = {
  value: WkeGirlCustomizationCategory;
  onChange: (category: WkeGirlCustomizationCategory) => void;
};

export function CharacterCategoryTabs({ value, onChange }: Props) {
  return (
    <div
      role="tablist"
      aria-label="WKE Girl customization"
      className="flex gap-2 overflow-x-auto pb-1 md:flex-col md:overflow-visible"
    >
      {WKE_GIRL_CUSTOMIZATION_CATEGORIES.map((category) => {
        const selected = category === value;
        return (
          <button
            key={category}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(category)}
            className={clsx(
              "min-h-11 shrink-0 rounded-lg border-4 px-3 py-2 text-sm font-bold md:min-w-[8.5rem]",
              selected
                ? "border-[var(--pl-ink)] bg-[var(--pl-purple)] text-white shadow-[3px_3px_0_0_#1e293b]"
                : "border-[var(--pl-border)] bg-white text-[var(--pl-ink)] hover:border-[var(--pl-purple)]",
            )}
          >
            {LABELS[category]}
          </button>
        );
      })}
    </div>
  );
}
