"use client";

import { clsx } from "clsx";
import type { CharacterSwatch } from "@/lib/character/character-types";

type Props = {
  label: string;
  swatches: CharacterSwatch[];
  value: string;
  onChange: (hex: string) => void;
};

export function ColorSwatches({ label, swatches, value, onChange }: Props) {
  return (
    <fieldset className="min-w-0">
      <legend className="mb-2 text-sm font-bold text-[var(--pl-ink)]">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {swatches.map((swatch) => {
          const selected = swatch.hex.toLowerCase() === value.toLowerCase();
          return (
            <button
              key={swatch.id}
              type="button"
              aria-label={`${label}: ${swatch.name}`}
              aria-pressed={selected}
              title={swatch.name}
              onClick={() => onChange(swatch.hex)}
              className={clsx(
                "h-9 w-9 rounded-full border-4",
                selected
                  ? "border-[var(--pl-ink)] ring-2 ring-[var(--pl-purple)] ring-offset-2"
                  : "border-white shadow-[0_0_0_2px_#d6d3d1]",
              )}
              style={{ backgroundColor: swatch.hex }}
            />
          );
        })}
      </div>
    </fieldset>
  );
}
