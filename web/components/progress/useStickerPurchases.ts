"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { playSfx } from "@/lib/audio/sfx";
import { isAudioMuted } from "@/lib/progress/local-storage";
import {
  getRewards,
  purchaseRandomStickerPacks,
  type RewardsSnapshot,
} from "@/lib/progress/rewards";
import { STICKER_COST_GOLD } from "@/lib/progress/sticker-store-constants";
import { pickRandomSticker } from "@/lib/progress/sticker-library";

export type UseStickerPurchasesOptions = {
  muted?: boolean;
  /** Bump when parent economy changes (e.g. dailyQuestUiKey). */
  rewardsSyncKey?: number;
  onRewardsChange?: () => void;
};

function resolveMuted(propMuted: boolean | undefined): boolean {
  if (propMuted !== undefined) return propMuted;
  return isAudioMuted();
}

export function useStickerPurchases({
  muted: mutedProp,
  rewardsSyncKey = 0,
  onRewardsChange,
}: UseStickerPurchasesOptions = {}) {
  const [gold, setGold] = useState(() => getRewards().gold);
  const [ownedStickerIds, setOwnedStickerIds] = useState<string[]>(
    () => getRewards().ownedStickerIds ?? [],
  );
  const [unboxedBatchIds, setUnboxedBatchIds] = useState<string[] | null>(null);
  const [rollingStickerId, setRollingStickerId] = useState<string | null>(null);
  const [isRollingSticker, setIsRollingSticker] = useState(false);
  const rollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rollFinalizeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const syncFromStorage = useCallback(() => {
    const r = getRewards();
    setGold(r.gold);
    setOwnedStickerIds(r.ownedStickerIds ?? []);
  }, []);

  useEffect(() => {
    syncFromStorage();
  }, [rewardsSyncKey, syncFromStorage]);

  const maxAffordableStickers = Math.floor(gold / STICKER_COST_GOLD);

  const notifyRewardsChange = useCallback(() => {
    onRewardsChange?.();
  }, [onRewardsChange]);

  const closeUnbox = useCallback(() => {
    setUnboxedBatchIds(null);
    setRollingStickerId(null);
    setIsRollingSticker(false);
  }, []);

  const beginUnboxReveal = useCallback(
    (purchasedIds: string[], snapshot: RewardsSnapshot) => {
      if (rollIntervalRef.current) clearInterval(rollIntervalRef.current);
      if (rollFinalizeTimeoutRef.current) clearTimeout(rollFinalizeTimeoutRef.current);
      setGold(snapshot.gold);
      setOwnedStickerIds(snapshot.ownedStickerIds);
      setUnboxedBatchIds(purchasedIds);
      notifyRewardsChange();
      setIsRollingSticker(true);
      setRollingStickerId(pickRandomSticker().id);
      rollIntervalRef.current = setInterval(() => {
        setRollingStickerId(pickRandomSticker().id);
      }, 85);
      const duration = purchasedIds.length === 1 ? 1450 : 1300;
      rollFinalizeTimeoutRef.current = setTimeout(() => {
        if (rollIntervalRef.current) clearInterval(rollIntervalRef.current);
        rollIntervalRef.current = null;
        if (purchasedIds.length === 1) {
          setRollingStickerId(purchasedIds[0]!);
        } else {
          setRollingStickerId(null);
        }
        setIsRollingSticker(false);
        playSfx("complete", resolveMuted(mutedProp));
      }, duration);
    },
    [mutedProp, notifyRewardsChange],
  );

  const buyRandomSticker = useCallback(() => {
    const pack = purchaseRandomStickerPacks({ count: 1, costGoldEach: STICKER_COST_GOLD });
    if (!pack) return false;
    beginUnboxReveal(pack.purchasedIds, pack.snapshot);
    return true;
  }, [beginUnboxReveal]);

  const buyMaxStickers = useCallback(() => {
    const n = Math.floor(gold / STICKER_COST_GOLD);
    if (n < 1) return false;
    const pack = purchaseRandomStickerPacks({ count: n, costGoldEach: STICKER_COST_GOLD });
    if (!pack) return false;
    beginUnboxReveal(pack.purchasedIds, pack.snapshot);
    return true;
  }, [gold, beginUnboxReveal]);

  useEffect(() => {
    return () => {
      if (rollIntervalRef.current) clearInterval(rollIntervalRef.current);
      if (rollFinalizeTimeoutRef.current) clearTimeout(rollFinalizeTimeoutRef.current);
    };
  }, []);

  const unboxOpen = Boolean(unboxedBatchIds && unboxedBatchIds.length > 0);

  return useMemo(
    () => ({
      gold,
      ownedStickerIds,
      maxAffordableStickers,
      stickerCostGold: STICKER_COST_GOLD,
      unboxedBatchIds,
      rollingStickerId,
      isRollingSticker,
      unboxOpen,
      buyRandomSticker,
      buyMaxStickers,
      closeUnbox,
      syncFromStorage,
      setGold,
      setOwnedStickerIds,
    }),
    [
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
      syncFromStorage,
    ],
  );
}

export type StickerPurchases = ReturnType<typeof useStickerPurchases>;
