"use client";

import { clsx } from "clsx";
import { useEffect, useMemo, useState } from "react";
import { KidButton } from "@/components/kid-ui/KidButton";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import { sellDuplicateStickersKeepOne, sellSticker } from "@/lib/progress/rewards";
import {
  STICKER_CARD_RING,
  STICKER_LIBRARY,
  STICKER_RARITY_LABEL_CLASS,
} from "@/lib/progress/sticker-library";
import {
  STICKER_RARITY_SORT_ORDER,
  sellGoldForStickerId,
} from "@/lib/progress/sticker-store-constants";

type Props = {
  ownedStickerIds: string[];
  onOwnedChange: (ownedStickerIds: string[]) => void;
  onGoldChange?: (gold: number) => void;
  emptyMessage?: string;
};

export function StickerAlbumGrid({
  ownedStickerIds,
  onOwnedChange,
  onGoldChange,
  emptyMessage = "No stickers yet. Buy packs above!",
}: Props) {
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
      const rDiff =
        STICKER_RARITY_SORT_ORDER[a.def.rarity] - STICKER_RARITY_SORT_ORDER[b.def.rarity];
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
    return sellGoldForStickerId(pendingSellEntry.def.id) ?? 0;
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
    if (bulkSellDialogOpen && sellExtrasPreview.gold <= 0) {
      setBulkSellDialogOpen(false);
    }
  }, [bulkSellDialogOpen, sellExtrasPreview.gold]);

  function sellAllExtrasKeepOne() {
    const next = sellDuplicateStickersKeepOne(sellGoldForStickerId);
    if (!next) return;
    onGoldChange?.(next.gold);
    onOwnedChange(next.ownedStickerIds);
    setBulkSellDialogOpen(false);
  }

  function sellOneSticker(stickerId: string) {
    const goldBack = sellGoldForStickerId(stickerId);
    if (goldBack == null) return;
    const next = sellSticker({ stickerId, goldBack });
    if (!next) return;
    onGoldChange?.(next.gold);
    onOwnedChange(next.ownedStickerIds);
  }

  return (
    <>
      <div className="shrink-0 space-y-2">
        <p className="text-sm font-semibold text-kid-ink/75">
          {stickerBookCollectedCount} of {STICKER_LIBRARY.length} stickers collected
        </p>
        {stickerBookCollectedCount > 0 && sellExtrasPreview.gold > 0 ?
          <KidButton
            type="button"
            variant="secondary"
            className="!text-sm"
            onClick={() => {
              setPendingSellStickerId(null);
              setBulkSellDialogOpen(true);
            }}
          >
            Sell extras (keep 1 each) — +{sellExtrasPreview.gold} gold
          </KidButton>
        : null}
      </div>

      {stickerBookCollectedCount === 0 ?
        <p className="rounded-xl border-2 border-dashed border-kid-ink/30 bg-kid-panel/80 px-4 py-3 text-center text-sm font-semibold text-kid-ink/85">
          {emptyMessage}
        </p>
      : null}

      <div className="min-h-0 flex-1 overflow-y-auto pr-1 [scrollbar-gutter:stable]">
        <div className="grid grid-cols-2 gap-3 pb-2 sm:grid-cols-3 sm:gap-4 md:grid-cols-4">
          {sortedStickerBookEntries.map(({ def, count }) => {
            const owned = count > 0;
            const sellGold = sellGoldForStickerId(def.id) ?? 0;
            return (
              <div
                key={def.id}
                className={clsx(
                  "relative flex min-h-[10rem] flex-col items-center rounded-2xl border-4 p-3 pt-4 text-center sm:min-h-[11rem]",
                  owned ? STICKER_CARD_RING[def.rarity] : "border-kid-ink/20 bg-neutral-200/80",
                )}
              >
                {owned ?
                  <span className="absolute right-1.5 top-1.5 rounded-full border-2 border-kid-ink bg-kid-ink px-1.5 py-0.5 text-[10px] font-black text-white tabular-nums">
                    ×{count}
                  </span>
                : (
                  <span className="absolute right-1.5 top-1.5 rounded-full border-2 border-kid-ink/25 bg-white/90 px-1.5 py-0.5 text-[9px] font-bold uppercase text-kid-ink/50">
                    Locked
                  </span>
                )}
                <span
                  className={clsx(
                    "text-5xl leading-none sm:text-6xl",
                    !owned && "opacity-[0.38] grayscale",
                  )}
                  aria-hidden
                >
                  {def.emoji}
                </span>
                <p
                  className={clsx(
                    "mt-2 line-clamp-2 text-sm font-extrabold leading-tight",
                    !owned && "text-kid-ink/55",
                  )}
                >
                  {def.label}
                </p>
                <p
                  className={clsx(
                    "mt-0.5 text-[10px] font-extrabold uppercase tracking-wide",
                    owned ? STICKER_RARITY_LABEL_CLASS[def.rarity] : "text-kid-ink/40",
                  )}
                >
                  {def.rarity}
                </p>
                {owned ?
                  <button
                    type="button"
                    className="mt-auto w-full rounded-lg border-2 border-amber-500 bg-amber-100 py-2 text-xs font-extrabold text-amber-950 active:scale-[0.98]"
                    onClick={() => setPendingSellStickerId(def.id)}
                  >
                    Sell +{sellGold}g
                  </button>
                : (
                  <p className="mt-auto pt-2 text-[10px] font-semibold text-kid-ink/45">Not yet</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {bulkSellDialogOpen ?
        <div
          className="fixed inset-0 z-[86] flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          onPointerDown={(e) => {
            if (e.target === e.currentTarget) setBulkSellDialogOpen(false);
          }}
        >
          <KidPanel className="max-w-md space-y-4 border-4 border-kid-ink p-5">
            <h4 className="text-xl font-extrabold text-kid-ink">Sell all extras?</h4>
            <p className="text-sm font-semibold text-kid-ink/85">
              Keep one of each sticker. Sell {sellExtrasPreview.extraCopies} extra
              {sellExtrasPreview.extraCopies === 1 ? " copy" : " copies"} for{" "}
              {sellExtrasPreview.gold} gold.
            </p>
            <div className="flex flex-wrap gap-2">
              <KidButton type="button" variant="secondary" onClick={() => setBulkSellDialogOpen(false)}>
                Cancel
              </KidButton>
              <KidButton type="button" variant="accent" onClick={sellAllExtrasKeepOne}>
                Sell for {sellExtrasPreview.gold} gold
              </KidButton>
            </div>
          </KidPanel>
        </div>
      : null}

      {pendingSellEntry && pendingSellEntry.count > 0 ?
        <div
          className="fixed inset-0 z-[85] flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          onPointerDown={(e) => {
            if (e.target === e.currentTarget) setPendingSellStickerId(null);
          }}
        >
          <KidPanel className="max-w-md space-y-4 border-4 border-kid-ink p-5">
            <h4 className="text-xl font-extrabold text-kid-ink">Sell this sticker?</h4>
            <p className="text-sm font-semibold text-kid-ink/85">
              Remove one copy of {pendingSellEntry.def.label} for {pendingSellGold} gold.
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
