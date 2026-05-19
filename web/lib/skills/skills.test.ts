import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PET_STORAGE_KEY } from "@/lib/pet/defaults";
import {
  REWARDS_STORAGE_KEY,
  applyTestStartQuizCorrectAnswer,
  getRewards,
  QUIZ_BASE_GOLD_PER_CORRECT,
} from "@/lib/progress/rewards";
import {
  applyQuizGoldBonus,
  petTreasureGoldAmount,
  quizGoldMultiplier,
} from "@/lib/skills/bonuses";
import {
  canClaimPetGold,
  claimPetGold,
  isPetWellCared,
  PET_GOLD_CLAIM_COOLDOWN_MS,
} from "@/lib/skills/pet-claim";
import { purchaseSkillRank, sanitizeSkillRanks } from "@/lib/skills/ranks";

function installMemoryStorage() {
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

function seedRewards(overrides: Record<string, unknown> = {}) {
  localStorage.setItem(
    REWARDS_STORAGE_KEY,
    JSON.stringify({
      gold: 0,
      experience: 0,
      rewardedEventIds: [],
      ownedStickerIds: [],
      quizEnergy: 0,
      quizStreak: 0,
      skillPoints: 5,
      skillRanks: {},
      ...overrides,
    }),
  );
}

function seedPet(meters: Record<string, number>, lastPetGoldClaimAt?: number) {
  localStorage.setItem(
    PET_STORAGE_KEY,
    JSON.stringify({
      schemaVersion: 1,
      meters,
      lastUpdatedAt: Date.now(),
      studyCarePending: false,
      lastPetGoldClaimAt,
    }),
  );
}

describe("skill bonuses", () => {
  it("quiz gold scales with rank", () => {
    expect(quizGoldMultiplier({ quiz_gold: 0 })).toBe(1);
    expect(quizGoldMultiplier({ quiz_gold: 5 })).toBe(1.05);
    expect(applyQuizGoldBonus(10, { quiz_gold: 5 })).toBe(10);
    expect(applyQuizGoldBonus(100, { quiz_gold: 5 })).toBe(105);
  });

  it("pet treasure gold scales with rank", () => {
    expect(petTreasureGoldAmount({})).toBe(0);
    expect(petTreasureGoldAmount({ pet_treasure: 1 })).toBe(8);
    expect(petTreasureGoldAmount({ pet_treasure: 5 })).toBe(20);
  });
});

describe("skill ranks", () => {
  beforeEach(() => {
    installMemoryStorage();
    localStorage.clear();
    seedRewards();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sanitizes unknown skills and caps rank", () => {
    const ranks = sanitizeSkillRanks({ quiz_gold: 99, unknown: 3 });
    expect(ranks.quiz_gold).toBe(5);
    expect(ranks).not.toHaveProperty("unknown");
  });

  it("purchases quiz_gold when skill points available", () => {
    const result = purchaseSkillRank("quiz_gold", 1);
    expect(result.ok).toBe(true);
    const rewards = getRewards();
    expect(rewards.skillRanks?.quiz_gold).toBe(1);
    expect(rewards.skillPoints).toBe(4);
  });

  it("rejects unimplemented skills", () => {
    const result = purchaseSkillRank("activity_gold", 1);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("not_implemented");
  });
});

describe("pet gold claim", () => {
  beforeEach(() => {
    installMemoryStorage();
    localStorage.clear();
    seedRewards({ skillRanks: { pet_treasure: 2 }, gold: 10 });
    seedPet({
      hunger: 80,
      thirst: 80,
      energy: 80,
      cleanliness: 80,
      happiness: 80,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("detects well cared pet", () => {
    const pet = JSON.parse(localStorage.getItem(PET_STORAGE_KEY)!);
    expect(isPetWellCared(pet)).toBe(true);
  });

  it("claims gold when eligible", () => {
    const check = canClaimPetGold();
    expect(check.ok).toBe(true);
    const result = claimPetGold(1_000_000);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.gold).toBe(11);
    expect(getRewards().gold).toBe(21);
  });

  it("blocks claim on cooldown", () => {
    claimPetGold(1_000_000);
    const check = canClaimPetGold(1_000_000 + PET_GOLD_CLAIM_COOLDOWN_MS - 1);
    expect(check.ok).toBe(false);
    if (!check.ok) expect(check.reason).toBe("on_cooldown");
  });
});

describe("quiz gold skill integration", () => {
  beforeEach(() => {
    installMemoryStorage();
    localStorage.clear();
    seedRewards({ skillRanks: { quiz_gold: 5 } });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("applies bonus on correct quiz answer", () => {
    applyTestStartQuizCorrectAnswer("evt-1");
    const rewards = getRewards();
    const expected = applyQuizGoldBonus(QUIZ_BASE_GOLD_PER_CORRECT, { quiz_gold: 5 });
    expect(rewards.gold).toBe(expected);
  });
});
