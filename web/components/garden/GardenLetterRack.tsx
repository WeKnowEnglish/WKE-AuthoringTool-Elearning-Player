"use client";

import { clsx } from "clsx";

type RackSlot = { id: string; letter: string };

type Props = {
  rack: RackSlot[];
  stagingSlotIds: string[];
  onLetterClick: (slotId: string) => void;
  disabled?: boolean;
};

export function GardenLetterRack({
  rack,
  stagingSlotIds,
  onLetterClick,
  disabled,
}: Props) {
  const used = new Set(stagingSlotIds);

  return (
    <div className="flex flex-wrap justify-center gap-1.5">
      {rack.map((slot) => {
        const slotUsed = used.has(slot.id);
        return (
          <button
            key={slot.id}
            type="button"
            disabled={disabled || slotUsed}
            className={clsx(
              "inline-flex h-10 min-w-[2.25rem] items-center justify-center rounded-md border-2 border-kid-ink bg-white px-1.5 text-base font-extrabold text-kid-ink",
              "transition-transform [touch-action:manipulation] active:scale-95",
              slotUsed && "opacity-35",
              !slotUsed && !disabled && "hover:scale-105",
            )}
            onClick={() => onLetterClick(slot.id)}
            aria-label={`Letter ${slot.letter}`}
          >
            {slot.letter}
          </button>
        );
      })}
      {rack.length === 0 ?
        <p className="text-sm font-semibold text-kid-ink/60">No letters yet — harvest a crop!</p>
      : null}
    </div>
  );
}
