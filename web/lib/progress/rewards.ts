"use client";

import { pickRandomSticker } from "./sticker-library";

export const REWARDS_STORAGE_KEY = "wke-rewards-v1";

/** Correct answers needed to fill the energy bar (test-start quiz + global UI). */
export const QUIZ_ENERGY_MAX = 5;
export const QUIZ_BASE_GOLD_PER_CORRECT = 1;
export const QUIZ_ENERGY_FILL_BONUS_GOLD = 5;

export type RewardsSnapshot = {
  gold: number;
  experience: number;
  rewardedEventIds: string[];
  ownedStickerIds: string[];
  /** Progress toward {@link QUIZ_ENERGY_MAX}; resets to 0 when the bar fills. */
  quizEnergy?: number;
  /** Consecutive correct answers (test-start quiz); wrong answer resets to 0. */
  quizStreak?: number;
};

function sanitize(n: unknown): number {
  return Number.isFinite(n) ? Math.max(0, Number(n)) : 0;
}

function emptyRewards(): RewardsSnapshot {
  return {
    gold: 0,
    experience: 0,
    rewardedEventIds: [],
    ownedStickerIds: [],
    quizEnergy: 0,
    quizStreak: 0,
  };
}

function sanitizeEnergy(n: unknown): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(Math.max(0, Math.floor(Number(n))), Math.max(0, QUIZ_ENERGY_MAX - 1));
}

function sanitizeStreak(n: unknown): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(Math.max(0, Math.floor(Number(n))), 500);
}

/** Pure helper for tests and UI previews. */
export function computeTestStartQuizCorrectOutcome(prev: {
  quizStreak: number;
  quizEnergy: number;
}): { quizStreak: number; quizEnergy: number; goldDelta: number } {
  const streak = sanitizeStreak(prev.quizStreak) + 1;
  let energy = sanitizeEnergy(prev.quizEnergy) + 1;
  let goldDelta = QUIZ_BASE_GOLD_PER_CORRECT * streak;
  if (energy >= QUIZ_ENERGY_MAX) {
    goldDelta += QUIZ_ENERGY_FILL_BONUS_GOLD;
    energy = 0;
  }
  return { quizStreak: streak, quizEnergy: energy, goldDelta };
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
      quizEnergy: sanitizeEnergy(parsed.quizEnergy),
      quizStreak: sanitizeStreak(parsed.quizStreak),
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
    quizEnergy: current.quizEnergy ?? 0,
    quizStreak: current.quizStreak ?? 0,
  };
  writeRewards(next);
  return next;
}

/** Awards streak-scaled gold + energy; on energy fill adds {@link QUIZ_ENERGY_FILL_BONUS_GOLD}. Idempotent per `eventId`. */
export function applyTestStartQuizCorrectAnswer(eventId: string): RewardsSnapshot {
  const current = getRewards();
  if (current.rewardedEventIds.includes(eventId)) return current;

  const { quizStreak, quizEnergy, goldDelta } = computeTestStartQuizCorrectOutcome({
    quizStreak: current.quizStreak ?? 0,
    quizEnergy: current.quizEnergy ?? 0,
  });

  const next: RewardsSnapshot = {
    ...current,
    gold: Math.max(0, current.gold + goldDelta),
    quizStreak,
    quizEnergy,
    rewardedEventIds: [...current.rewardedEventIds, eventId].slice(-500),
  };
  writeRewards(next);
  return next;
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
