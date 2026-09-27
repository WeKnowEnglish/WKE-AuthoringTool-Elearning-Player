"use client";

import { clsx } from "clsx";
import type { WkeGirlPartOption } from "@/lib/character/wke-girl-assets";

type Props = {
  options: WkeGirlPartOption[];
  selectedId: string;
  onSelect: (id: string) => void;
};

export function CharacterOptionGrid({ options, selectedId, onSelect }: Props) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 md:flex-wrap md:overflow-visible">
      {options.map((option) => {
        const selected = selectedId === option.id;
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={selected}
            title={option.name}
            onClick={() => onSelect(option.id)}
            className={clsx(
              "min-h-16 min-w-32 shrink-0 rounded-lg border-4 px-3 py-2 text-sm font-semibold",
              selected
                ? "border-[var(--pl-ink)] bg-[var(--pl-purple-soft)] text-[var(--pl-ink)] ring-2 ring-[var(--pl-purple)]"
                : "border-[var(--pl-border)] bg-white text-[var(--pl-ink)] hover:border-[var(--pl-purple)]",
            )}
          >
            {option.name}
          </button>
        );
      })}
    </div>
  );
}
