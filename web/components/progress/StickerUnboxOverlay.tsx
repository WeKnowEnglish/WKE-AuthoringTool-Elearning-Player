"use client";

import { clsx } from "clsx";
import { useMemo } from "react";
import { KidButton } from "@/components/kid-ui/KidButton";
import { KidConfetti } from "@/components/kid-ui/KidConfetti";
import {
  STICKER_CARD_RING,
  STICKER_LIBRARY,
  STICKER_RARITY_LABEL_CLASS,
} from "@/lib/progress/sticker-library";
import { STICKER_COST_GOLD } from "@/lib/progress/sticker-store-constants";

type Props = {
  unboxedBatchIds: string[];
  rollingStickerId: string | null;
  isRollingSticker: boolean;
  gold: number;
  maxAffordableStickers: number;
  onClose: () => void;
  onBuyAnother: () => void;
  onBuyMax: () => void;
  /** When set, primary action after close is this (e.g. place on scene). */
  onContinue?: () => void;
  continueLabel?: string;
};

export function StickerUnboxOverlay({
  unboxedBatchIds,
  rollingStickerId,
  isRollingSticker,
  gold,
  maxAffordableStickers,
  onClose,
  onBuyAnother,
  onBuyMax,
  onContinue,
  continueLabel = "View sticker book",
}: Props) {
  const unboxedDefs = useMemo(
    () =>
      unboxedBatchIds
        .map((id) => STICKER_LIBRARY.find((s) => s.id === id))
        .filter((d): d is (typeof STICKER_LIBRARY)[number] => d != null),
    [unboxedBatchIds],
  );

  const rollingSticker =
    rollingStickerId ? STICKER_LIBRARY.find((s) => s.id === rollingStickerId) ?? null : null;

  if (unboxedDefs.length === 0) return null;

  return (
    <div className="fixed left-0 top-0 z-[90] flex h-dvh w-screen items-center justify-center bg-black p-3 sm:p-4">
      <KidConfetti active />
      <div className="flex max-h-[96dvh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border-4 border-yellow-300 bg-neutral-950 text-center text-white shadow-2xl">
        <div className="shrink-0 p-6 pb-4 sm:p-8 sm:pb-5">
          <p className="text-base font-semibold uppercase tracking-[0.2em] text-yellow-200">
            {isRollingSticker ?
              unboxedBatchIds.length === 1 ?
                "Picking your sticker..."
              : `Opening ${unboxedBatchIds.length} sticker packs...`
            : unboxedBatchIds.length === 1 ?
              "New sticker unlocked"
            : `${unboxedBatchIds.length} new stickers!`}
          </p>
          {unboxedBatchIds.length === 1 || isRollingSticker ?
            <>
              <p
                className="mt-6 text-[8rem] leading-none drop-shadow-[0_0_24px_rgba(255,255,255,0.25)] sm:mt-8 sm:text-[11rem]"
                aria-hidden
              >
                {(isRollingSticker ? (rollingSticker ?? unboxedDefs[0]) : unboxedDefs[0]).emoji}
              </p>
              {!isRollingSticker && unboxedBatchIds.length === 1 ?
                <>
                  <p className="mt-6 text-3xl font-extrabold text-yellow-100 sm:text-4xl">
                    {unboxedDefs[0]!.label}
                  </p>
                  <p className="mt-2 text-lg font-semibold text-emerald-300">
                    Congratulations! ({unboxedDefs[0]!.rarity})
                  </p>
                </>
              : null}
            </>
          : null}
          {!isRollingSticker && unboxedBatchIds.length > 1 ?
            <div className="mt-6 max-h-[min(52dvh,28rem)] overflow-y-auto px-1 sm:max-h-[min(50dvh,32rem)]">
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4">
                {unboxedDefs.map((def, index) => (
                  <li
                    key={`${def.id}-${index}`}
                    className={clsx(
                      "flex flex-col items-center rounded-xl border-2 border-white/20 px-2 py-3",
                      STICKER_CARD_RING[def.rarity],
                    )}
                  >
                    <span className="text-5xl leading-none sm:text-6xl" aria-hidden>
                      {def.emoji}
                    </span>
                    <span className="mt-2 line-clamp-2 text-xs font-bold leading-tight text-neutral-900 sm:text-sm">
                      {def.label}
                    </span>
                    <span
                      className={clsx(
                        "mt-1 text-[10px] font-extrabold uppercase tracking-wider sm:text-[11px]",
                        STICKER_RARITY_LABEL_CLASS[def.rarity],
                      )}
                    >
                      {def.rarity}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          : null}
        </div>
        <div className="mt-auto flex shrink-0 flex-wrap justify-center gap-2 border-t border-white/10 bg-black/30 px-4 py-4 sm:gap-3 sm:px-6">
          <KidButton type="button" variant="secondary" disabled={isRollingSticker} onClick={onClose}>
            Close
          </KidButton>
          {onContinue ?
            <KidButton
              type="button"
              disabled={isRollingSticker}
              onClick={() => {
                onClose();
                onContinue();
              }}
            >
              {continueLabel}
            </KidButton>
          : null}
          <KidButton
            type="button"
            disabled={isRollingSticker || gold < STICKER_COST_GOLD}
            title={
              gold < STICKER_COST_GOLD ?
                `Need ${STICKER_COST_GOLD} gold to buy another sticker`
              : `Buy another sticker for ${STICKER_COST_GOLD} gold`
            }
            onClick={onBuyAnother}
          >
            Buy another
          </KidButton>
          <KidButton
            type="button"
            variant="accent"
            disabled={isRollingSticker || maxAffordableStickers < 1}
            title={
              maxAffordableStickers < 1 ?
                `Need ${STICKER_COST_GOLD} gold to buy stickers`
              : `Buy ${maxAffordableStickers} sticker${maxAffordableStickers === 1 ? "" : "s"} for ${maxAffordableStickers * STICKER_COST_GOLD} gold`
            }
            onClick={onBuyMax}
          >
            Buy max ({maxAffordableStickers})
          </KidButton>
        </div>
      </div>
    </div>
  );
}
