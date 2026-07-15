"use client";

import Image from "next/image";
import { clsx } from "clsx";
import type { LiveGameCarrySlot, LiveGamePlayerCarry } from "@/lib/live-game/liveblocks/config";
import { resolveCarryArt } from "@/lib/live-game/modes/english-craft/english-craft-art";
import { ENGLISH_CRAFT_ART } from "@/lib/live-game/modes/english-craft/english-craft-art";
import { ENGLISH_CRAFT_CARRY_HUD_ICON_PX } from "@/lib/live-game/modes/english-craft/gameplay-v1";

type Props = {
  bag: LiveGamePlayerCarry | null;
  capacity: number;
  backpackOwned: boolean;
  disabled?: boolean;
  onHoldSlot: (slotIndex: number) => void;
  onDropHeld?: () => void;
  dropDisabled?: boolean;
  dropSubmitting?: boolean;
  onEatHeld?: () => void;
  eatDisabled?: boolean;
  eatSubmitting?: boolean;
  holdingBread?: boolean;
};

function slotLabel(slot: LiveGameCarrySlot): string {
  return slot.kind === "bread" ? "bread" : slot.resourceType;
}

function slotArt(slot: LiveGameCarrySlot): string {
  return slot.kind === "bread" ? resolveCarryArt("bread") : resolveCarryArt(slot.resourceType);
}

export function LiveGameCarrySlotBar({
  bag,
  capacity,
  backpackOwned,
  disabled = false,
  onHoldSlot,
  onDropHeld,
  dropDisabled = false,
  dropSubmitting = false,
  onEatHeld,
  eatDisabled = false,
  eatSubmitting = false,
  holdingBread = false,
}: Props) {
  const slots = Array.from({ length: capacity }, (_, index) => bag?.slots[index] ?? null);
  const heldIndex = bag?.heldSlotIndex ?? 0;

  if (!backpackOwned && !bag) return null;

  return (
    <div className="pointer-events-auto flex flex-col items-center gap-2">
      <div
        className="flex items-center gap-2 rounded-2xl border-2 border-amber-300/60 bg-amber-950/90 px-3 py-2 text-amber-50 backdrop-blur-sm"
        aria-label={backpackOwned ? "Backpack slots" : "Carried item"}
      >
        {backpackOwned ?
          <span className="relative inline-block h-6 w-6 shrink-0" aria-hidden>
            <Image
              src={ENGLISH_CRAFT_ART.backpack}
              alt=""
              fill
              className="object-contain"
              sizes="24px"
              unoptimized
              draggable={false}
            />
          </span>
        : null}
        <div className="flex gap-1.5">
          {slots.map((slot, index) => {
            const filled = slot != null;
            const held = filled && index === heldIndex;
            return (
              <button
                key={index}
                type="button"
                disabled={disabled || !filled}
                onClick={() => onHoldSlot(index)}
                className={clsx(
                  "relative flex h-12 w-12 items-center justify-center rounded-xl border-2 transition",
                  filled ?
                    held ?
                      "border-emerald-300 bg-emerald-900/80 ring-2 ring-emerald-300/70"
                    : "border-amber-200/60 bg-amber-900/70 hover:border-amber-100"
                  : "border-amber-200/20 bg-amber-950/40",
                  disabled || !filled ? "cursor-default opacity-80" : "cursor-pointer",
                )}
                aria-label={
                  filled ?
                    held ?
                      `Holding ${slotLabel(slot)}`
                    : `Hold ${slotLabel(slot)}`
                  : `Empty slot ${index + 1}`
                }
                aria-pressed={held}
              >
                {slot ?
                  <span
                    className="relative inline-block"
                    style={{
                      width: ENGLISH_CRAFT_CARRY_HUD_ICON_PX,
                      height: ENGLISH_CRAFT_CARRY_HUD_ICON_PX,
                    }}
                  >
                    <Image
                      src={slotArt(slot)}
                      alt=""
                      fill
                      className="object-contain"
                      sizes={`${ENGLISH_CRAFT_CARRY_HUD_ICON_PX}px`}
                      unoptimized
                      draggable={false}
                    />
                  </span>
                : null}
              </button>
            );
          })}
        </div>
        {bag && onDropHeld ?
          <button
            type="button"
            className="rounded-lg border border-amber-200/40 px-2 py-1 text-[11px] font-extrabold disabled:opacity-50"
            disabled={dropDisabled || dropSubmitting}
            onClick={onDropHeld}
          >
            {dropSubmitting ? "..." : "Drop"}
          </button>
        : null}
        {holdingBread && onEatHeld ?
          <button
            type="button"
            className="rounded-lg border border-emerald-200/50 bg-emerald-800/70 px-2 py-1 text-[11px] font-extrabold disabled:opacity-50"
            disabled={eatDisabled || eatSubmitting}
            onClick={onEatHeld}
          >
            {eatSubmitting ? "..." : "Eat (E)"}
          </button>
        : null}
      </div>
    </div>
  );
}
