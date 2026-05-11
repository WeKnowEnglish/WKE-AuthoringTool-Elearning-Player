import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  computeTestStartQuizCorrectOutcome,
  purchaseRandomStickerPacks,
  QUIZ_BASE_GOLD_PER_CORRECT,
  QUIZ_ENERGY_FILL_BONUS_GOLD,
  QUIZ_ENERGY_MAX,
  REWARDS_STORAGE_KEY,
  getRewards,
} from "./rewards";

describe("computeTestStartQuizCorrectOutcome", () => {
  it("first correct: streak 1, one energy, base gold", () => {
    const o = computeTestStartQuizCorrectOutcome({ quizStreak: 0, quizEnergy: 0 });
    expect(o.quizStreak).toBe(1);
    expect(o.quizEnergy).toBe(1);
    expect(o.goldDelta).toBe(QUIZ_BASE_GOLD_PER_CORRECT);
  });

  it("streak multiplies base gold", () => {
    const o = computeTestStartQuizCorrectOutcome({ quizStreak: 2, quizEnergy: 0 });
    expect(o.quizStreak).toBe(3);
    expect(o.goldDelta).toBe(QUIZ_BASE_GOLD_PER_CORRECT * 3);
  });

  it("fills energy bar: bonus gold and energy resets to 0", () => {
    const o = computeTestStartQuizCorrectOutcome({
      quizStreak: 0,
      quizEnergy: QUIZ_ENERGY_MAX - 1,
    });
    expect(o.quizEnergy).toBe(0);
    expect(o.goldDelta).toBe(QUIZ_BASE_GOLD_PER_CORRECT + QUIZ_ENERGY_FILL_BONUS_GOLD);
  });
});

function installMemoryRewardsStorage() {
  const store: Record<string, string> = {};
  const ls = {
    getItem: (k: string) => (k in store ? store[k]! : null),
    setItem: (k: string, v: string) => {
      store[k] = String(v);
    },
    removeItem: (k: string) => {
      delete store[k];
    },
    clear: () => {
      for (const k of Object.keys(store)) delete store[k];
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (i: number) => Object.keys(store)[i] ?? null,
  } as Storage;
  vi.stubGlobal("localStorage", ls);
  vi.stubGlobal("window", Object.assign(globalThis, { localStorage: ls }));
}

describe("purchaseRandomStickerPacks", () => {
  beforeEach(() => {
    installMemoryRewardsStorage();
    localStorage.clear();
    localStorage.setItem(
      REWARDS_STORAGE_KEY,
      JSON.stringify({
        gold: 25,
        experience: 0,
        rewardedEventIds: [],
        ownedStickerIds: [],
        quizEnergy: 0,
        quizStreak: 0,
      }),
    );
  });

  it("buys n stickers in one write and deducts full gold", () => {
    const r = purchaseRandomStickerPacks({ count: 3, costGoldEach: 5 });
    expect(r).not.toBeNull();
    expect(r!.purchasedIds).toHaveLength(3);
    expect(r!.snapshot.gold).toBe(10);
    expect(r!.snapshot.ownedStickerIds).toHaveLength(3);
    expect(getRewards().gold).toBe(10);
  });

  it("returns null when count < 1", () => {
    expect(purchaseRandomStickerPacks({ count: 0, costGoldEach: 5 })).toBeNull();
  });

  it("returns null when gold is insufficient for full purchase", () => {
    expect(purchaseRandomStickerPacks({ count: 10, costGoldEach: 5 })).toBeNull();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });
});
