"use client";

import { clsx } from "clsx";
import type { FruitTrayItem } from "@/lib/blender/drink-recipes";

type Props = {
  fruits: FruitTrayItem[];
  disabled?: boolean;
  usedFruitIds: Set<string>;
  onPick: (fruitId: string) => void;
};

export function FruitTray({ fruits, disabled, usedFruitIds, onPick }: Props) {
  return (
    <div className="flex flex-wrap justify-center gap-2" role="list" aria-label="Fruit tray">
      {fruits.map((fruit) => {
        const used = usedFruitIds.has(fruit.id);
        return (
          <button
            key={fruit.id}
            type="button"
            role="listitem"
            disabled={disabled || used}
            className={clsx(
              "flex min-h-12 min-w-[4.5rem] flex-col items-center justify-center rounded-xl border-2 px-2 py-1.5 text-center font-bold transition",
              used ?
                "cursor-not-allowed border-kid-ink/20 bg-kid-ink/5 opacity-50"
              : "cursor-pointer border-kid-ink bg-white shadow-sm hover:bg-amber-50 active:scale-95",
              disabled && !used && "pointer-events-none opacity-60",
            )}
            onClick={() => onPick(fruit.id)}
            aria-label={fruit.label}
          >
            <span className="text-2xl leading-none" aria-hidden>
              {fruit.emoji}
            </span>
            <span className="mt-0.5 text-[10px] uppercase tracking-wide text-kid-ink/80">
              {fruit.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
