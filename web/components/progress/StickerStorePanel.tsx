"use client";

import { clsx } from "clsx";
import { useEffect, useMemo, useState } from "react";
import { KidButton } from "@/components/kid-ui/KidButton";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import { StickerPurchaseActions } from "@/components/progress/StickerPurchaseActions";
import { StickerUnboxOverlay } from "@/components/progress/StickerUnboxOverlay";
import { useStickerPurchases } from "@/components/progress/useStickerPurchases";
import {
  sellDuplicateStickersKeepOne,
  sellSticker,
} from "@/lib/progress/rewards";
import {
  STICKER_CARD_RING,
  STICKER_LIBRARY,
  STICKER_RARITY_LABEL_CLASS,
} from "@/lib/progress/sticker-library";
import {
  STICKER_RARITY_SORT_ORDER,
  STICKER_SELL_GOLD_BY_RARITY,
  sellGoldForStickerId,
} from "@/lib/progress/sticker-store-constants";

export type StickerStorePanelProps = {
  muted?: boolean;
  title?: string;
  description?: string;
  emptyBookMessage?: string;
  onRewardsChange?: () => void;
  /** Sync gold/owned from storage when parent bumps economy. */
  rewardsSyncKey?: number;
};

export function StickerStorePanel({
  muted: mutedProp,
  title = "Sticker store",
  description = "Earn gold in lessons and quizzes, then spend it on random sticker packs.",
  emptyBookMessage = "No stickers yet. Buy one from the Book tab on Home.",
  onRewardsChange,
  rewardsSyncKey = 0,
}: StickerStorePanelProps) {
  const purchases = useStickerPurchases({
    muted: mutedProp,
    rewardsSyncKey,
    onRewardsChange,
  });
  const {
    gold,
    ownedStickerIds,
    maxAffordableStickers,
    unboxedBatchIds,
    rollingStickerId,
    isRollingSticker,
    unboxOpen,
    buyRandomSticker,
    buyMaxStickers,
    closeUnbox,
    setGold,
    setOwnedStickerIds,
  } = purchases;

  const [bookOpen, setBookOpen] = useState(false);
  const [bulkSellDialogOpen, setBulkSellDialogOpen] = useState(false);
  const [pendingSellStickerId, setPendingSellStickerId] = useState<string | null>(null);

  const stickerBookEntries = useMemo(
    () =>
      STICKER_LIBRARY.map((def) => ({
        def,
        count: ownedStickerIds.filter((id) => id === def.id).length,
      })),
    [ownedStickerIds],
  );

  const stickerBookCollectedCount = useMemo(
    () => stickerBookEntries.filter((e) => e.count > 0).length,
    [stickerBookEntries],
  );

  const sortedStickerBookEntries = useMemo(() => {
    return [...stickerBookEntries].sort((a, b) => {
      const rDiff = STICKER_RARITY_SORT_ORDER[a.def.rarity] - STICKER_RARITY_SORT_ORDER[b.def.rarity];
      if (rDiff !== 0) return rDiff;
      const aOwned = a.count > 0 ? 1 : 0;
      const bOwned = b.count > 0 ? 1 : 0;
      if (aOwned !== bOwned) return bOwned - aOwned;
      return a.def.label.localeCompare(b.def.label, undefined, { numeric: true });
    });
  }, [stickerBookEntries]);

  const pendingSellEntry = useMemo(() => {
    if (!pendingSellStickerId) return null;
    return sortedStickerBookEntries.find((e) => e.def.id === pendingSellStickerId) ?? null;
  }, [pendingSellStickerId, sortedStickerBookEntries]);

  const pendingSellGold = useMemo(() => {
    if (!pendingSellEntry || pendingSellEntry.count < 1) return 0;
    return STICKER_SELL_GOLD_BY_RARITY[pendingSellEntry.def.rarity];
  }, [pendingSellEntry]);

  const sellExtrasPreview = useMemo(() => {
    const counts = new Map<string, number>();
    for (const id of ownedStickerIds) {
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    let previewGold = 0;
    let extraCopies = 0;
    for (const [id, c] of counts) {
      if (c < 2) continue;
      const unit = sellGoldForStickerId(id);
      if (unit == null || unit <= 0) continue;
      extraCopies += c - 1;
      previewGold += (c - 1) * unit;
    }
    return { gold: previewGold, extraCopies };
  }, [ownedStickerIds]);

  useEffect(() => {
    if (!bookOpen) {
      setPendingSellStickerId(null);
      setBulkSellDialogOpen(false);
    }
  }, [bookOpen]);

  useEffect(() => {
    if (bulkSellDialogOpen && sellExtrasPreview.gold <= 0) {
      setBulkSellDialogOpen(false);
    }
  }, [bulkSellDialogOpen, sellExtrasPreview.gold]);

  function sellAllExtrasKeepOne() {
    const next = sellDuplicateStickersKeepOne(sellGoldForStickerId);
    if (!next) return;
    setGold(next.gold);
    setOwnedStickerIds(next.ownedStickerIds);
    setBulkSellDialogOpen(false);
    onRewardsChange?.();
  }

  function sellOneSticker(stickerId: string) {
    const goldBack = sellGoldForStickerId(stickerId);
    if (goldBack == null) return;
    const next = sellSticker({ stickerId, goldBack });
    if (!next) return;
    setGold(next.gold);
    setOwnedStickerIds(next.ownedStickerIds);
    onRewardsChange?.();
  }

  return (
    <>
      <KidPanel>
        <h2 className="text-xl font-bold text-kid-ink">{title}</h2>
        <p className="mt-1 text-sm text-kid-ink/80">{description}</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <StickerPurchaseActions
            gold={gold}
            maxAffordableStickers={maxAffordableStickers}
            disabled={isRollingSticker}
            muted={mutedProp}
            showGoldChip
            onBuyRandom={buyRandomSticker}
            onBuyMax={buyMaxStickers}
          />
          <KidButton type="button" variant="secondary" onClick={() => setBookOpen(true)}>
            Open sticker book ({ownedStickerIds.length})
          </KidButton>
        </div>
      </KidPanel>

      {unboxOpen && unboxedBatchIds ?
        <StickerUnboxOverlay
          unboxedBatchIds={unboxedBatchIds}
          rollingStickerId={rollingStickerId}
          isRollingSticker={isRollingSticker}
          gold={gold}
          maxAffordableStickers={maxAffordableStickers}
          onClose={closeUnbox}
          onBuyAnother={buyRandomSticker}
          onBuyMax={buyMaxStickers}
          onContinue={() => setBookOpen(true)}
          continueLabel="View sticker book"
        />
      : null}

      {bookOpen ?
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 p-3 sm:p-6">
          <div className="flex max-h-[94dvh] w-full max-w-6xl flex-col rounded-2xl border-4 border-kid-ink bg-[#fffdf8] p-5 shadow-2xl sm:p-7 md:p-8">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b-4 border-kid-ink/15 pb-4">
              <div>
                <h3 className="text-2xl font-extrabold text-kid-ink sm:text-3xl md:text-4xl">
                  Sticker book
                </h3>
                <p className="mt-1 text-sm font-semibold text-kid-ink/75 sm:text-base">
                  {stickerBookCollectedCount} of {STICKER_LIBRARY.length} stickers collected
                </p>
                {stickerBookCollectedCount > 0 && sellExtrasPreview.gold > 0 ?
                  <KidButton
                    type="button"
                    variant="secondary"
                    className="mt-3"
                    onClick={() => {
                      setPendingSellStickerId(null);
                      setBulkSellDialogOpen(true);
                    }}
                    title="Sell every duplicate copy. You keep one of each sticker type."
                  >
                    Sell extras (keep 1 each) — +{sellExtrasPreview.gold} gold
                  </KidButton>
                : null}
              </div>
              <KidButton type="button" variant="secondary" className="shrink-0" onClick={() => setBookOpen(false)}>
                Close
              </KidButton>
            </div>
            {stickerBookCollectedCount === 0 ?
              <p className="mt-4 rounded-xl border-2 border-dashed border-kid-ink/30 bg-kid-panel/80 px-4 py-3 text-center text-sm font-semibold text-kid-ink/85 sm:text-base">
                {emptyBookMessage}
              </p>
            : null}
            <div className="mt-5 min-h-0 flex-1 overflow-y-auto pr-1 [scrollbar-gutter:stable]">
              <div className="grid grid-cols-2 gap-4 pb-2 sm:grid-cols-3 sm:gap-5 md:grid-cols-4 lg:grid-cols-5">
                {sortedStickerBookEntries.map(({ def, count }) => {
                  const owned = count > 0;
                  const sellGold = sellGoldForStickerId(def.id) ?? 0;
                  return (
                    <div
                      key={def.id}
                      role="group"
                      aria-label={
                        owned ?
                          `${def.label}, ${def.rarity}, ${count} in collection`
                        : `${def.label}, ${def.rarity}, not collected`
                      }
                      className={clsx(
                        "relative flex min-h-[11.5rem] flex-col items-center rounded-2xl border-4 p-4 pt-5 text-center sm:min-h-[12.5rem]",
                        owned ? STICKER_CARD_RING[def.rarity] : "border-kid-ink/20 bg-neutral-200/80",
                      )}
                    >
                      {owned ?
                        <span className="absolute right-2 top-2 rounded-full border-2 border-kid-ink bg-kid-ink px-2 py-0.5 text-xs font-black text-white tabular-nums shadow-sm">
                          ×{count}
                        </span>
                      : (
                        <span
                          className="absolute right-2 top-2 rounded-full border-2 border-kid-ink/25 bg-white/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-kid-ink/50"
                          aria-hidden
                        >
                          Locked
                        </span>
                      )}
                      <span
                        className={clsx(
                          "select-none text-6xl leading-none sm:text-7xl md:text-8xl",
                          !owned && "opacity-[0.38] grayscale",
                        )}
                        aria-hidden
                      >
                        {def.emoji}
                      </span>
                      <p
                        className={clsx(
                          "mt-3 line-clamp-2 min-h-[2.5rem] w-full px-0.5 text-sm font-extrabold leading-tight text-kid-ink sm:text-base",
                          !owned && "text-kid-ink/55",
                        )}
                      >
                        {def.label}
                      </p>
                      <p
                        className={clsx(
                          "mt-1 text-[11px] font-extrabold uppercase tracking-[0.14em] sm:text-xs",
                          owned ? STICKER_RARITY_LABEL_CLASS[def.rarity] : "text-kid-ink/40",
                        )}
                      >
                        {def.rarity}
                      </p>
                      {!owned ?
                        <p className="mt-auto pt-3 text-xs font-semibold text-kid-ink/45">Not in your book yet</p>
                      : (
                        <button
                          type="button"
                          className="mt-auto w-full max-w-[12rem] rounded-xl border-2 border-amber-500 bg-amber-100 py-2.5 text-sm font-extrabold text-amber-950 shadow-[2px_2px_0_rgba(120,53,15,0.25)] transition-transform [touch-action:manipulation] hover:bg-amber-200 active:scale-[0.98]"
                          onClick={() => setPendingSellStickerId(def.id)}
                          title={`Sell one copy for ${sellGold} gold`}
                        >
                          Sell +{sellGold} gold
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      : null}
      {bookOpen && bulkSellDialogOpen ?
        <div
          className="fixed inset-0 z-[86] flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="sell-extras-confirm-title"
          onPointerDown={(e) => {
            if (e.target === e.currentTarget) setBulkSellDialogOpen(false);
          }}
        >
          <KidPanel className="max-w-md space-y-4 border-4 border-kid-ink p-5 shadow-2xl">
            <h4 id="sell-extras-confirm-title" className="text-xl font-extrabold text-kid-ink">
              Sell all extras?
            </h4>
            <p className="text-sm font-semibold text-kid-ink/85">
              You keep one copy of each sticker in your book.{" "}
              <span className="tabular-nums">{sellExtrasPreview.extraCopies}</span> extra
              {sellExtrasPreview.extraCopies === 1 ? " copy" : " copies"} will be sold for a total of{" "}
              <span className="tabular-nums">{sellExtrasPreview.gold}</span> gold.
            </p>
            <div className="flex flex-wrap gap-2">
              <KidButton type="button" variant="secondary" onClick={() => setBulkSellDialogOpen(false)}>
                Cancel
              </KidButton>
              <KidButton
                type="button"
                variant="accent"
                disabled={sellExtrasPreview.gold < 1}
                onClick={sellAllExtrasKeepOne}
              >
                Sell extras for {sellExtrasPreview.gold} gold
              </KidButton>
            </div>
          </KidPanel>
        </div>
      : null}
      {bookOpen && pendingSellEntry && pendingSellEntry.count > 0 ?
        <div
          className="fixed inset-0 z-[85] flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="sell-sticker-confirm-title"
          onPointerDown={(e) => {
            if (e.target === e.currentTarget) setPendingSellStickerId(null);
          }}
        >
          <KidPanel className="max-w-md space-y-4 border-4 border-kid-ink p-5 shadow-2xl">
            <h4 id="sell-sticker-confirm-title" className="text-xl font-extrabold text-kid-ink">
              Sell this sticker?
            </h4>
            <div className="flex items-center gap-3 rounded-xl border-2 border-kid-ink/20 bg-kid-panel/60 px-3 py-2">
              <span className="text-4xl leading-none" aria-hidden>
                {pendingSellEntry.def.emoji}
              </span>
              <div>
                <p className="font-bold text-kid-ink">{pendingSellEntry.def.label}</p>
                <p className="text-xs font-semibold uppercase tracking-wide text-kid-ink/60">
                  {pendingSellEntry.def.rarity}
                  {pendingSellEntry.count > 1 ? ` · You have ×${pendingSellEntry.count}` : null}
                </p>
              </div>
            </div>
            <p className="text-sm font-semibold text-kid-ink/85">
              One copy will be removed from your book and you will get{" "}
              <span className="tabular-nums">{pendingSellGold}</span> gold.
            </p>
            <div className="flex flex-wrap gap-2">
              <KidButton type="button" variant="secondary" onClick={() => setPendingSellStickerId(null)}>
                Cancel
              </KidButton>
              <KidButton
                type="button"
                variant="accent"
                onClick={() => {
                  sellOneSticker(pendingSellEntry.def.id);
                  setPendingSellStickerId(null);
                }}
              >
                Sell for {pendingSellGold} gold
              </KidButton>
            </div>
          </KidPanel>
        </div>
      : null}
    </>
  );
}
