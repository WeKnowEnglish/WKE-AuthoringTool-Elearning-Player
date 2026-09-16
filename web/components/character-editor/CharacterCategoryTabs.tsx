"use client";

import { clsx } from "clsx";
import { CHARACTER_CATEGORIES, type CharacterCategory } from "@/lib/character/character-types";

const LABELS: Record<CharacterCategory, string> = {
  body: "Body",
  hair: "Hair",
  face: "Face",
  top: "Top",
  bottom: "Bottom",
  shoes: "Shoes",
  accessory: "Extras",
};

type Props = {
  value: CharacterCategory;
  onChange: (category: CharacterCategory) => void;
};

export function CharacterCategoryTabs({ value, onChange }: Props) {
  return (
    <div
      role="tablist"
      aria-label="Character parts"
      className="flex gap-2 overflow-x-auto pb-1 md:flex-col md:overflow-visible"
    >
      {CHARACTER_CATEGORIES.map((category) => {
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
