"use client";

import { levelFromXp, levelsGainedBetween } from "./leveling";
import { totalLevelUpPayoutForLevels } from "./level-rewards";
import { dispatchLevelUp } from "./level-up-events";
import { unlockLabelsAtLevel } from "./unlock-registry";
import { pickRandomSticker } from "./sticker-library";
import { sanitizeSkillRanks } from "@/lib/skills/ranks";
import type { SkillRanks } from "@/lib/skills/types";
import { applyQuizGoldBonus } from "@/lib/skills/bonuses";

export const REWARDS_STORAGE_KEY = "wke-rewards-v1";

/** Correct answers needed to fill the energy bar (test-start quiz + global UI). */
export const QUIZ_ENERGY_MAX = 5;
export const QUIZ_BASE_GOLD_PER_CORRECT = 1;
export const QUIZ_ENERGY_FILL_BONUS_GOLD = 5;
export const QUIZ_BASE_XP_PER_CORRECT = 3;
export const QUIZ_ENERGY_FILL_BONUS_XP = 15;
export const DAILY_QUEST_XP = 6;

export type RewardsSnapshot = {
  gold: number;
  experience: number;
  rewardedEventIds: string[];
  ownedStickerIds: string[];
  /** Progress toward {@link QUIZ_ENERGY_MAX}; resets to 0 when the bar fills. */
  quizEnergy?: number;
  /** Consecutive correct answers (test-start quiz); wrong answer resets to 0. */
  quizStreak?: number;
  /** Cached tier; synced from XP on read. */
  level?: number;
  /** Level numbers whose level-up loot was already granted. */
  claimedLevelRewards?: number[];
  /** Spendable points earned from leveling up. */
  skillPoints?: number;
  /** Purchased skill tree ranks. */
  skillRanks?: SkillRanks;
};

export type AwardRewardsMeta = {
  levelsGained: number[];
  levelUpGold: number;
  levelUpSkillPoints: number;
  skippedDuplicate: boolean;
};

function sanitize(n: unknown): number {
  return Number.isFinite(n) ? Math.max(0, Number(n)) : 0;
}

function sanitizeClaimedLevels(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((v): v is number => typeof v === "number" && Number.isFinite(v))
    .map((v) => Math.max(1, Math.floor(v)))
    .slice(-200);
}

function emptyRewards(): RewardsSnapshot {
  return {
    gold: 0,
    experience: 0,
    rewardedEventIds: [],
    ownedStickerIds: [],
    quizEnergy: 0,
    quizStreak: 0,
    level: 1,
    claimedLevelRewards: [],
    skillPoints: 0,
    skillRanks: {},
  };
}

function sanitizeSkillPoints(n: unknown): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(Math.max(0, Math.floor(Number(n))), 10_000);
}

function sanitizeEnergy(n: unknown): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(Math.max(0, Math.floor(Number(n))), Math.max(0, QUIZ_ENERGY_MAX - 1));
}

function sanitizeStreak(n: unknown): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(Math.max(0, Math.floor(Number(n))), 500);
}

function syncLevelFields(snapshot: RewardsSnapshot): RewardsSnapshot {
  const level = levelFromXp(snapshot.experience);
  return {
    ...snapshot,
    level,
    claimedLevelRewards: sanitizeClaimedLevels(snapshot.claimedLevelRewards),
  };
}

export function getPlayerLevel(snapshot?: RewardsSnapshot): number {
  const s = snapshot ?? getRewards();
  return s.level ?? levelFromXp(s.experience);
}

/** Pure helper for tests and UI previews. */
export function computeTestStartQuizCorrectOutcome(prev: {
  quizStreak: number;
  quizEnergy: number;
}): {
  quizStreak: number;
  quizEnergy: number;
  goldDelta: number;
  experienceDelta: number;
} {
  const streak = sanitizeStreak(prev.quizStreak) + 1;
  let energy = sanitizeEnergy(prev.quizEnergy) + 1;
  let goldDelta = QUIZ_BASE_GOLD_PER_CORRECT * streak;
  let experienceDelta = QUIZ_BASE_XP_PER_CORRECT + Math.min(streak - 1, 4);
  if (energy >= QUIZ_ENERGY_MAX) {
    goldDelta += QUIZ_ENERGY_FILL_BONUS_GOLD;
    experienceDelta += QUIZ_ENERGY_FILL_BONUS_XP;
    energy = 0;
  }
  return { quizStreak: streak, quizEnergy: energy, goldDelta, experienceDelta };
}

export function getRewards(): RewardsSnapshot {
  if (typeof window === "undefined") return emptyRewards();
  try {
    const raw = localStorage.getItem(REWARDS_STORAGE_KEY);
    if (!raw) return emptyRewards();
    const parsed = JSON.parse(raw) as Partial<RewardsSnapshot>;
    return syncLevelFields({
      gold: sanitize(parsed.gold),
      experience: sanitize(parsed.experience),
      rewardedEventIds: Array.isArray(parsed.rewardedEventIds) ? parsed.rewardedEventIds.slice(-500) : [],
      ownedStickerIds:
        Array.isArray(parsed.ownedStickerIds) ?
          parsed.ownedStickerIds.filter((v): v is string => typeof v === "string").slice(-1000)
        : [],
      quizEnergy: sanitizeEnergy(parsed.quizEnergy),
      quizStreak: sanitizeStreak(parsed.quizStreak),
      level: typeof parsed.level === "number" ? Math.max(1, Math.floor(parsed.level)) : undefined,
      claimedLevelRewards: sanitizeClaimedLevels(parsed.claimedLevelRewards),
      skillPoints: sanitizeSkillPoints(parsed.skillPoints),
      skillRanks: sanitizeSkillRanks(parsed.skillRanks),
    });
  } catch {
    return emptyRewards();
  }
}

function writeRewards(next: RewardsSnapshot) {
  localStorage.setItem(REWARDS_STORAGE_KEY, JSON.stringify(syncLevelFields(next)));
}

/** Partial update without dropping other reward fields. */
export function setRewardsFields(
  patch: Partial<Pick<RewardsSnapshot, "gold" | "skillPoints" | "skillRanks">>,
) {
  const current = getRewards();
  writeRewards(
    syncLevelFields({
      ...current,
      ...patch,
      skillRanks:
        patch.skillRanks !== undefined ?
          sanitizeSkillRanks(patch.skillRanks)
        : current.skillRanks,
    }),
  );
}

function applyMilestonesAndLevelUps(
  prev: RewardsSnapshot,
  next: RewardsSnapshot,
): {
  snapshot: RewardsSnapshot;
  levelsGained: number[];
  levelUpGold: number;
  levelUpSkillPoints: number;
} {
  const levelsGained = levelsGainedBetween(prev.experience, next.experience);
  const { gold: levelUpGold, skillPoints: levelUpSkillPoints, payouts, newlyClaimed } =
    totalLevelUpPayoutForLevels(levelsGained, next.claimedLevelRewards ?? []);
  const snapshot = syncLevelFields({
    ...next,
    gold: next.gold + levelUpGold,
    skillPoints: sanitizeSkillPoints((next.skillPoints ?? 0) + levelUpSkillPoints),
    claimedLevelRewards: [...(next.claimedLevelRewards ?? []), ...newlyClaimed],
  });

  if (levelsGained.length > 0) {
    const unlockLabels = levelsGained.flatMap((l) => unlockLabelsAtLevel(l));
    dispatchLevelUp({
      newLevel: snapshot.level ?? levelFromXp(snapshot.experience),
      levelsGained,
      payouts,
      totalSkillPoints: levelUpSkillPoints,
      totalBonusGold: levelUpGold,
      unlockLabels,
      milestoneGold: levelUpGold,
    });
  }

  return { snapshot, levelsGained, levelUpGold, levelUpSkillPoints };
}

export function awardRewards(input: {
  goldDelta: number;
  experienceDelta: number;
  eventId?: string;
}): RewardsSnapshot {
  const { snapshot } = awardRewardsWithMeta(input);
  return snapshot;
}

export function awardRewardsWithMeta(input: {
  goldDelta: number;
  experienceDelta: number;
  eventId?: string;
}): { snapshot: RewardsSnapshot; meta: AwardRewardsMeta } {
  const current = getRewards();
  if (input.eventId && current.rewardedEventIds.includes(input.eventId)) {
    return {
      snapshot: current,
      meta: {
        levelsGained: [],
        levelUpGold: 0,
        levelUpSkillPoints: 0,
        skippedDuplicate: true,
      },
    };
  }

  const base: RewardsSnapshot = {
    gold: Math.max(0, current.gold + Math.max(0, input.goldDelta)),
    experience: Math.max(0, current.experience + Math.max(0, input.experienceDelta)),
    rewardedEventIds:
      input.eventId ? [...current.rewardedEventIds, input.eventId].slice(-500) : current.rewardedEventIds,
    ownedStickerIds: current.ownedStickerIds,
    quizEnergy: current.quizEnergy ?? 0,
    quizStreak: current.quizStreak ?? 0,
    claimedLevelRewards: current.claimedLevelRewards ?? [],
    skillPoints: current.skillPoints ?? 0,
    skillRanks: current.skillRanks,
  };

  const { snapshot, levelsGained, levelUpGold, levelUpSkillPoints } =
    applyMilestonesAndLevelUps(current, base);
  writeRewards(snapshot);
  return {
    snapshot,
    meta: {
      levelsGained,
      levelUpGold,
      levelUpSkillPoints,
      skippedDuplicate: false,
    },
  };
}

/** Awards streak-scaled gold + XP, energy, and bonuses. Idempotent per `eventId`. */
export function applyTestStartQuizCorrectAnswer(eventId: string): RewardsSnapshot {
  const current = getRewards();
  if (current.rewardedEventIds.includes(eventId)) return current;

  const { quizStreak, quizEnergy, goldDelta, experienceDelta } = computeTestStartQuizCorrectOutcome({
    quizStreak: current.quizStreak ?? 0,
    quizEnergy: current.quizEnergy ?? 0,
  });
  const bonusGold = applyQuizGoldBonus(goldDelta, sanitizeSkillRanks(current.skillRanks));

  const base: RewardsSnapshot = {
    ...current,
    gold: Math.max(0, current.gold + bonusGold),
    experience: Math.max(0, current.experience + experienceDelta),
    quizStreak,
    quizEnergy,
    rewardedEventIds: [...current.rewardedEventIds, eventId].slice(-500),
    skillPoints: current.skillPoints ?? 0,
    skillRanks: current.skillRanks,
  };

  const { snapshot } = applyMilestonesAndLevelUps(current, base);
  writeRewards(snapshot);
  return snapshot;
}

/** Wrong answer: streak resets; energy unchanged. */
export function applyTestStartQuizWrongAnswer(): RewardsSnapshot {
  const current = getRewards();
  const next: RewardsSnapshot = {
    ...current,
    quizStreak: 0,
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

const MAX_STICKER_PACK_BULK = 500;

/**
 * Buy `count` independent random stickers at `costGoldEach` each (single storage write).
 * Returns null if `count` &lt; 1 or gold is insufficient for the full purchase.
 */
export function purchaseRandomStickerPacks(input: {
  count: number;
  costGoldEach: number;
}): { snapshot: RewardsSnapshot; purchasedIds: string[] } | null {
  const costEach = Math.max(0, input.costGoldEach);
  const n = Math.min(Math.max(0, Math.floor(input.count)), MAX_STICKER_PACK_BULK);
  if (n < 1) return null;
  const totalCost = n * costEach;
  const current = getRewards();
  if (current.gold < totalCost) return null;
  const purchasedIds: string[] = [];
  for (let i = 0; i < n; i += 1) {
    purchasedIds.push(pickRandomSticker().id);
  }
  const next: RewardsSnapshot = {
    ...current,
    gold: current.gold - totalCost,
    ownedStickerIds: [...current.ownedStickerIds, ...purchasedIds].slice(-1000),
  };
  writeRewards(next);
  return { snapshot: next, purchasedIds };
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

/**
 * Sell every duplicate copy so at most one of each priced sticker id remains.
 * If `sellGoldForStickerId` returns null for an id, all copies of that id are kept (no payout).
 * Returns null when there is nothing to sell (no priced duplicates).
 */
export function sellDuplicateStickersKeepOne(
  sellGoldForStickerId: (stickerId: string) => number | null,
): RewardsSnapshot | null {
  const current = getRewards();
  const counts = new Map<string, number>();
  for (const id of current.ownedStickerIds) {
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }

  let goldAdd = 0;
  for (const [id, c] of counts) {
    if (c < 2) continue;
    const unit = sellGoldForStickerId(id);
    if (unit == null || unit <= 0) continue;
    goldAdd += (c - 1) * unit;
  }
  if (goldAdd <= 0) return null;

  const keepLimit = new Map<string, number>();
  for (const [id, c] of counts) {
    const unit = sellGoldForStickerId(id);
    keepLimit.set(id, unit == null || unit <= 0 ? c : Math.min(1, c));
  }

  const kept = new Map<string, number>();
  const nextOwned: string[] = [];
  for (const id of current.ownedStickerIds) {
    const limit = keepLimit.get(id) ?? 0;
    const k = kept.get(id) ?? 0;
    if (k < limit) {
      nextOwned.push(id);
      kept.set(id, k + 1);
    }
  }

  const next: RewardsSnapshot = {
    ...current,
    gold: current.gold + goldAdd,
    ownedStickerIds: nextOwned,
  };
  writeRewards(next);
  return next;
}
