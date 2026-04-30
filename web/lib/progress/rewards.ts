"use client";

export const REWARDS_STORAGE_KEY = "wke-rewards-v1";

export type RewardsSnapshot = {
  gold: number;
  experience: number;
  rewardedEventIds: string[];
  ownedStickerIds: string[];
};

function sanitize(n: unknown): number {
  return Number.isFinite(n) ? Math.max(0, Number(n)) : 0;
}

function emptyRewards(): RewardsSnapshot {
  return { gold: 0, experience: 0, rewardedEventIds: [], ownedStickerIds: [] };
}

export function getRewards(): RewardsSnapshot {
  if (typeof window === "undefined") return emptyRewards();
  try {
    const raw = localStorage.getItem(REWARDS_STORAGE_KEY);
    if (!raw) return emptyRewards();
    const parsed = JSON.parse(raw) as Partial<RewardsSnapshot>;
    return {
      gold: sanitize(parsed.gold),
      experience: sanitize(parsed.experience),
      rewardedEventIds: Array.isArray(parsed.rewardedEventIds) ? parsed.rewardedEventIds.slice(-500) : [],
      ownedStickerIds:
        Array.isArray(parsed.ownedStickerIds) ?
          parsed.ownedStickerIds.filter((v): v is string => typeof v === "string").slice(-1000)
        : [],
    };
  } catch {
    return emptyRewards();
  }
}

function writeRewards(next: RewardsSnapshot) {
  localStorage.setItem(REWARDS_STORAGE_KEY, JSON.stringify(next));
}

export function awardRewards(input: {
  goldDelta: number;
  experienceDelta: number;
  eventId?: string;
}): RewardsSnapshot {
  const current = getRewards();
  if (input.eventId && current.rewardedEventIds.includes(input.eventId)) return current;
  const next: RewardsSnapshot = {
    gold: Math.max(0, current.gold + Math.max(0, input.goldDelta)),
    experience: Math.max(0, current.experience + Math.max(0, input.experienceDelta)),
    rewardedEventIds:
      input.eventId ? [...current.rewardedEventIds, input.eventId].slice(-500) : current.rewardedEventIds,
    ownedStickerIds: current.ownedStickerIds,
  };
  writeRewards(next);
  return next;
}

export function purchaseSticker(input: { stickerId: string; costGold: number }): RewardsSnapshot | null {
  const cost = Math.max(0, input.costGold);
  const current = getRewards();
  if (current.gold < cost) return null;
  const next: RewardsSnapshot = {
    ...current,
    gold: current.gold - cost,
    ownedStickerIds: [...current.ownedStickerIds, input.stickerId].slice(-1000),
  };
  writeRewards(next);
  return next;
}

export function sellSticker(input: { stickerId: string; goldBack: number }): RewardsSnapshot | null {
  const current = getRewards();
  const idx = current.ownedStickerIds.indexOf(input.stickerId);
  if (idx < 0) return null;
  const nextOwned = current.ownedStickerIds.slice();
  nextOwned.splice(idx, 1);
  const next: RewardsSnapshot = {
    ...current,
    gold: current.gold + Math.max(0, input.goldBack),
    ownedStickerIds: nextOwned,
  };
  writeRewards(next);
  return next;
}
