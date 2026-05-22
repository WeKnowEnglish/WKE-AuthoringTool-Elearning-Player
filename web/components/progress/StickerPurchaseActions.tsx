"use client";

import { clsx } from "clsx";
import { KidButton } from "@/components/kid-ui/KidButton";
import { playSfx } from "@/lib/audio/sfx";
import { STICKER_COST_GOLD } from "@/lib/progress/sticker-store-constants";

type Props = {
  gold: number;
  maxAffordableStickers: number;
  disabled?: boolean;
  muted?: boolean;
  compact?: boolean;
  showGoldChip?: boolean;
  onBuyRandom: () => void;
  onBuyMax: () => void;
  className?: string;
};

const COMPACT_BTN = "!min-h-8 shrink-0 !px-2.5 text-xs sm:!min-h-9 sm:!px-3 sm:text-sm";

export function StickerPurchaseActions({
  gold,
  maxAffordableStickers,
  disabled = false,
  muted = false,
  compact = false,
  showGoldChip = true,
  onBuyRandom,
  onBuyMax,
  className,
}: Props) {
  const btnClass = compact ? COMPACT_BTN : undefined;

  function tapBuy(fn: () => void) {
    playSfx("tap", muted);
    fn();
  }

  return (
    <div className={clsx("flex flex-wrap items-center justify-center gap-1 sm:gap-1.5", className)}>
      {showGoldChip ?
        <span
          className={clsx(
            "shrink-0 rounded-full border border-amber-300 bg-amber-50 font-semibold text-amber-900 tabular-nums",
            compact ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm",
          )}
          title="Your gold"
        >
          🪙 {gold}
        </span>
      : null}
      <KidButton
        type="button"
        variant="accent"
        className={btnClass}
        disabled={disabled || gold < STICKER_COST_GOLD}
        title={
          gold < STICKER_COST_GOLD ?
            `Need ${STICKER_COST_GOLD} gold to buy a sticker`
          : `Buy random sticker for ${STICKER_COST_GOLD} gold`
        }
        onClick={() => tapBuy(onBuyRandom)}
      >
        {compact ? `Buy (${STICKER_COST_GOLD}🪙)` : `Buy sticker (${STICKER_COST_GOLD} gold)`}
      </KidButton>
      <KidButton
        type="button"
        variant="secondary"
        className={btnClass}
        disabled={disabled || maxAffordableStickers < 1}
        title={
          maxAffordableStickers < 1 ?
            `Need ${STICKER_COST_GOLD} gold to buy stickers`
          : `Buy ${maxAffordableStickers} sticker${maxAffordableStickers === 1 ? "" : "s"} for ${maxAffordableStickers * STICKER_COST_GOLD} gold`
        }
        onClick={() => tapBuy(onBuyMax)}
      >
        {compact ? `Max (${maxAffordableStickers})` : `Buy max (${maxAffordableStickers})`}
      </KidButton>
    </div>
  );
}
