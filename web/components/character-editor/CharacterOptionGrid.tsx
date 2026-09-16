"use client";

import { clsx } from "clsx";
import { NONE_ACCESSORY_ID } from "@/lib/character/character-assets";
import type { CharacterCategory, CharacterPartDef } from "@/lib/character/character-types";

type Props = {
  category: CharacterCategory;
  options: CharacterPartDef[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
};

function OptionButton({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      title={label}
      onClick={onClick}
      className={clsx(
        "min-h-16 min-w-24 shrink-0 rounded-lg border-4 px-3 py-2 text-sm font-semibold",
        selected
          ? "border-[var(--pl-ink)] bg-[var(--pl-purple-soft)] text-[var(--pl-ink)] ring-2 ring-[var(--pl-purple)]"
          : "border-[var(--pl-border)] bg-white text-[var(--pl-ink)] hover:border-[var(--pl-purple)]",
      )}
    >
      {label}
    </button>
  );
}

export function CharacterOptionGrid({ category, options, selectedId, onSelect }: Props) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 md:flex-wrap md:overflow-visible">
      {category === "accessory" ? (
        <OptionButton
          label="None"
          selected={selectedId === null || selectedId === NONE_ACCESSORY_ID}
          onClick={() => onSelect(null)}
        />
      ) : null}
      {options.map((option) => (
        <OptionButton
          key={option.id}
          label={option.name}
          selected={selectedId === option.id}
          onClick={() => onSelect(option.id)}
        />
      ))}
    </div>
  );
}
