"use client";

import { StickerAlbumGrid } from "@/components/progress/StickerAlbumGrid";
import { StickerPurchaseActions } from "@/components/progress/StickerPurchaseActions";
import { StickerUnboxOverlay } from "@/components/progress/StickerUnboxOverlay";
import { useStickerPurchases } from "@/components/progress/useStickerPurchases";

type Props = {
  muted: boolean;
  dailyQuestUiKey: number;
  onRewardsChange?: () => void;
};

export function StickersCollectionPage({ muted, dailyQuestUiKey, onRewardsChange }: Props) {
  const purchases = useStickerPurchases({
    muted,
    rewardsSyncKey: dailyQuestUiKey,
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

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
      <StickerPurchaseActions
        gold={gold}
        maxAffordableStickers={maxAffordableStickers}
        disabled={isRollingSticker}
        muted={muted}
        compact
        showGoldChip
        onBuyRandom={buyRandomSticker}
        onBuyMax={buyMaxStickers}
      />
      <StickerAlbumGrid
        ownedStickerIds={ownedStickerIds}
        emptyMessage="No stickers yet. Buy a pack above!"
        onOwnedChange={(ids) => {
          setOwnedStickerIds(ids);
          onRewardsChange?.();
        }}
        onGoldChange={(g) => {
          setGold(g);
          onRewardsChange?.();
        }}
      />
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
          onContinue={closeUnbox}
          continueLabel="Back to collection"
        />
      : null}
    </div>
  );
}
