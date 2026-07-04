import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { applyFertilizerAt, applyWateringCanAt, harvestAt, plantSeedAt } from "@/lib/garden/actions";
import {
  emptyGardenSnapshot,
  FERTILIZER_COOLDOWN_MS,
  GARDEN_GRID_COLS,
  GARDEN_GRID_ROWS,
  GARDEN_STORAGE_KEY,
  STARTER_SEED_COUNT,
  WATERING_CAN_COOLDOWN_MS,
  WATERING_CAN_GROW_MULTIPLIER,
} from "@/lib/garden/defaults";
import {
  GROW_MS_BY_TIER,
  remainingGrowMs,
  resolveGrowthStage,
} from "@/lib/garden/growth";
import { trySpellWord } from "@/lib/garden/spell-actions";
import { grantGardenSeedForQuiz } from "@/lib/garden/quiz-rewards";
import { canUseFertilizer } from "@/lib/garden/fertilizer";
import { canAffordWord, consumeLetters } from "@/lib/garden/spelling";
import { getGardenSpellingLevel } from "@/lib/garden/spelling-levels";
import { getGardenSnapshot, setGardenSnapshot } from "@/lib/garden/storage";
import { canUseWateringCan } from "@/lib/garden/watering-can";
import { DAILY_QUESTS_STORAGE_KEY } from "@/lib/teststartpage/daily-quests";
import { minLevelForUnlock } from "@/lib/progress/unlock-registry";

function installLocalStorage() {
  const store = new Map<string, string>();
  const localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => store.clear(),
  };
  vi.stubGlobal("localStorage", localStorage);
  vi.stubGlobal("window", Object.assign(globalThis, { localStorage }));
  return localStorage;
}

describe("garden growth", () => {
  it("progresses through stages based on elapsed time", () => {
    const plot = {
      row: 0,
      col: 0,
      seedId: "s1",
      seedTier: "common" as const,
      plantedAt: 0,
      growMultiplier: 1,
    };
    const duration = GROW_MS_BY_TIER.common;

    expect(resolveGrowthStage(plot, duration * 0.1, "common")).toBe("sprout");
    expect(resolveGrowthStage(plot, duration * 0.5, "common")).toBe("sprout");
    expect(resolveGrowthStage(plot, duration * 0.7, "common")).toBe("growing");
    expect(resolveGrowthStage(plot, duration, "common")).toBe("ready");
  });

  it("counts down remaining grow time", () => {
    const plot = {
      row: 0,
      col: 0,
      seedId: "s1",
      seedTier: "common" as const,
      plantedAt: 1000,
      growMultiplier: 1,
    };
    expect(remainingGrowMs(plot, "common", 1000 + 30_000)).toBe(30_000);
    expect(remainingGrowMs(plot, "common", 1000 + GROW_MS_BY_TIER.common)).toBe(0);
  });
});

describe("garden actions", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    installLocalStorage();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("plants a seed and removes it from the pouch", () => {
    const snap = emptyGardenSnapshot(1000);
    expect(snap.seedPouch).toHaveLength(STARTER_SEED_COUNT);

    const planted = plantSeedAt(snap, 0, 0, 1000);
    expect(planted.ok).toBe(true);
    if (!planted.ok) return;

    expect(planted.snapshot.seedPouch).toHaveLength(STARTER_SEED_COUNT - 1);
    expect(planted.snapshot.plots[0]?.seedId).toBeTruthy();
    expect(planted.snapshot.plots[0]?.plantedAt).toBe(1000);
  });

  it("harvests a ready crop and adds a letter", () => {
    const snap = emptyGardenSnapshot(1000);
    const planted = plantSeedAt(snap, 1, 1, 1000);
    if (!planted.ok) throw new Error("plant failed");

    const readyAt = 1000 + GROW_MS_BY_TIER.common;
    const harvested = harvestAt(planted.snapshot, 1, 1, readyAt);
    expect(harvested.ok).toBe(true);
    if (!harvested.ok) return;

    expect(harvested.letter).toMatch(/^[A-Z]$/);
    expect(harvested.snapshot.plots[5]?.seedId).toBeNull();
    expect(Object.values(harvested.snapshot.letters).reduce((a, b) => a + b, 0)).toBe(1);
  });

  it("rejects harvest before crop is ready", () => {
    const snap = emptyGardenSnapshot(1000);
    const planted = plantSeedAt(snap, 0, 0, 1000);
    if (!planted.ok) throw new Error("plant failed");

    const result = harvestAt(planted.snapshot, 0, 0, 2000);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("not_ready");
  });
});

describe("watering can", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    installLocalStorage();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("keeps the watering can after use and speeds up a growing crop", () => {
    const plantedAt = 10_000;
    const now = plantedAt + 20_000;
    let snap = {
      ...emptyGardenSnapshot(plantedAt),
      items: { watering_can: 1 },
    };
    const planted = plantSeedAt(snap, 0, 0, plantedAt);
    if (!planted.ok) throw new Error("plant failed");
    snap = planted.snapshot;

    const before = remainingGrowMs(snap.plots[0]!, "common", now);
    const watered = applyWateringCanAt(snap, 0, 0, now);
    expect(watered.ok).toBe(true);
    if (!watered.ok) return;

    expect(watered.snapshot.items.watering_can).toBe(1);
    expect(watered.snapshot.lastWateringCanUsedAt).toBe(now);
    expect(canUseWateringCan(watered.snapshot, now)).toBe(false);
    expect(watered.snapshot.plots[0]?.growMultiplier).toBe(WATERING_CAN_GROW_MULTIPLIER);
    const after = remainingGrowMs(watered.snapshot.plots[0]!, "common", now);
    expect(after).toBeLessThan(before);
    expect(after).toBeCloseTo(before / 2, -2);
  });

  it("allows watering again after the cooldown expires", () => {
    const plantedAt = 1000;
    const usedAt = plantedAt + 5000;
    const readyAt = usedAt + WATERING_CAN_COOLDOWN_MS;
    const extraSeed = {
      id: "extra",
      tier: "common" as const,
      grantedAt: plantedAt,
      sourceEventId: "test",
    };
    let snap = {
      ...emptyGardenSnapshot(plantedAt),
      items: { watering_can: 1 },
      seedPouch: [...emptyGardenSnapshot(plantedAt).seedPouch, extraSeed],
    };
    const planted = plantSeedAt(snap, 0, 0, plantedAt);
    if (!planted.ok) throw new Error("plant failed");
    const first = applyWateringCanAt(planted.snapshot, 0, 0, usedAt);
    if (!first.ok) throw new Error("water failed");

    const planted2 = plantSeedAt(
      { ...first.snapshot, seedPouch: [...first.snapshot.seedPouch, extraSeed] },
      1,
      1,
      readyAt - 30_000,
    );
    if (!planted2.ok) throw new Error("plant failed");
    const cooled = applyWateringCanAt(planted2.snapshot, 1, 1, readyAt);
    expect(cooled.ok).toBe(true);
  });

  it("rejects watering an empty plot", () => {
    const snap = { ...emptyGardenSnapshot(), items: { watering_can: 1 } };
    const result = applyWateringCanAt(snap, 1, 1);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("plot_empty");
  });

  it("rejects watering the same plot twice", () => {
    const plantedAt = 1000;
    let snap = { ...emptyGardenSnapshot(plantedAt), items: { watering_can: 1 } };
    const planted = plantSeedAt(snap, 0, 0, plantedAt);
    if (!planted.ok) throw new Error("plant failed");
    const first = applyWateringCanAt(planted.snapshot, 0, 0, plantedAt + 5000);
    if (!first.ok) throw new Error("water failed");
    const second = applyWateringCanAt(first.snapshot, 0, 0, plantedAt + 6000);
    expect(second.ok).toBe(false);
    if (second.ok) return;
    expect(second.reason).toBe("already_treated");
  });

  it("rejects watering a fertilized growing plot", () => {
    const plantedAt = 1000;
    const now = plantedAt + 5000;
    let snap = {
      ...emptyGardenSnapshot(plantedAt),
      items: { watering_can: 1, fertilizer: 1 },
    };
    const planted = plantSeedAt(snap, 0, 0, plantedAt);
    if (!planted.ok) throw new Error("plant failed");
    const fertilized = applyFertilizerAt(planted.snapshot, 0, 0, now);
    if (!fertilized.ok) throw new Error("fertilize failed");
    const watered = applyWateringCanAt(fertilized.snapshot, 0, 0, now + 1000);
    expect(watered.ok).toBe(false);
    if (watered.ok) return;
    expect(watered.reason).toBe("plot_ready");
  });

  it("rejects watering a second plot while on cooldown", () => {
    const plantedAt = 1000;
    const usedAt = plantedAt + 5000;
    const extraSeed = {
      id: "extra",
      tier: "common" as const,
      grantedAt: plantedAt,
      sourceEventId: "test",
    };
    let snap = {
      ...emptyGardenSnapshot(plantedAt),
      items: { watering_can: 1 },
      seedPouch: [...emptyGardenSnapshot(plantedAt).seedPouch, extraSeed],
    };
    const planted = plantSeedAt(snap, 0, 0, plantedAt);
    if (!planted.ok) throw new Error("plant failed");
    const planted2 = plantSeedAt(planted.snapshot, 1, 1, plantedAt);
    if (!planted2.ok) throw new Error("plant failed");
    const first = applyWateringCanAt(planted2.snapshot, 0, 0, usedAt);
    if (!first.ok) throw new Error("water failed");
    const second = applyWateringCanAt(first.snapshot, 1, 1, usedAt + 1000);
    expect(second.ok).toBe(false);
    if (second.ok) return;
    expect(second.reason).toBe("on_cooldown");
  });
});

describe("fertilizer", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    installLocalStorage();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("ripens a growing crop instantly and keeps the unlock", () => {
    const plantedAt = 10_000;
    const now = plantedAt + 20_000;
    let snap = {
      ...emptyGardenSnapshot(plantedAt),
      items: { fertilizer: 1 },
    };
    const planted = plantSeedAt(snap, 0, 0, plantedAt);
    if (!planted.ok) throw new Error("plant failed");
    snap = planted.snapshot;

    expect(resolveGrowthStage(snap.plots[0]!, now, "common")).toBe("sprout");
    const fertilized = applyFertilizerAt(snap, 0, 0, now);
    expect(fertilized.ok).toBe(true);
    if (!fertilized.ok) return;

    expect(fertilized.snapshot.items.fertilizer).toBe(1);
    expect(fertilized.snapshot.lastFertilizerUsedAt).toBe(now);
    expect(canUseFertilizer(fertilized.snapshot, now)).toBe(false);
    expect(resolveGrowthStage(fertilized.snapshot.plots[0]!, now, "common")).toBe("ready");
    expect(fertilized.snapshot.plots[0]?.fertilizedAt).toBe(now);
  });

  it("rejects fertilizing while on cooldown", () => {
    const plantedAt = 1000;
    const usedAt = plantedAt + 5000;
    const extraSeed = {
      id: "extra",
      tier: "common" as const,
      grantedAt: plantedAt,
      sourceEventId: "test",
    };
    let snap = {
      ...emptyGardenSnapshot(plantedAt),
      items: { fertilizer: 1 },
      seedPouch: [...emptyGardenSnapshot(plantedAt).seedPouch, extraSeed],
    };
    const planted = plantSeedAt(snap, 0, 0, plantedAt);
    if (!planted.ok) throw new Error("plant failed");
    const planted2 = plantSeedAt(planted.snapshot, 1, 1, plantedAt);
    if (!planted2.ok) throw new Error("plant failed");
    const first = applyFertilizerAt(planted2.snapshot, 0, 0, usedAt);
    if (!first.ok) throw new Error("fertilize failed");
    const second = applyFertilizerAt(first.snapshot, 1, 1, usedAt + 1000);
    expect(second.ok).toBe(false);
    if (second.ok) return;
    expect(second.reason).toBe("on_cooldown");
  });

  it("allows fertilizing again after cooldown", () => {
    const plantedAt = 1000;
    const usedAt = plantedAt + 5000;
    const readyAt = usedAt + FERTILIZER_COOLDOWN_MS;
    const extraSeed = {
      id: "extra",
      tier: "common" as const,
      grantedAt: plantedAt,
      sourceEventId: "test",
    };
    let snap = {
      ...emptyGardenSnapshot(plantedAt),
      items: { fertilizer: 1 },
      seedPouch: [...emptyGardenSnapshot(plantedAt).seedPouch, extraSeed],
    };
    const planted = plantSeedAt(snap, 0, 0, plantedAt);
    if (!planted.ok) throw new Error("plant failed");
    const first = applyFertilizerAt(planted.snapshot, 0, 0, usedAt);
    if (!first.ok) throw new Error("fertilize failed");
    const planted2 = plantSeedAt(
      { ...first.snapshot, seedPouch: [...first.snapshot.seedPouch, extraSeed] },
      1,
      1,
      readyAt - 30_000,
    );
    if (!planted2.ok) throw new Error("plant failed");
    const second = applyFertilizerAt(planted2.snapshot, 1, 1, readyAt);
    expect(second.ok).toBe(true);
  });

  it("rejects fertilizing a watered plot", () => {
    const plantedAt = 1000;
    const now = plantedAt + 5000;
    let snap = {
      ...emptyGardenSnapshot(plantedAt),
      items: { watering_can: 1, fertilizer: 1 },
    };
    const planted = plantSeedAt(snap, 0, 0, plantedAt);
    if (!planted.ok) throw new Error("plant failed");
    const watered = applyWateringCanAt(planted.snapshot, 0, 0, now);
    if (!watered.ok) throw new Error("water failed");
    const fertilized = applyFertilizerAt(watered.snapshot, 0, 0, now + 1000);
    expect(fertilized.ok).toBe(false);
    if (fertilized.ok) return;
    expect(fertilized.reason).toBe("already_treated");
  });
});

describe("garden spelling", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    installLocalStorage();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("checks and consumes letters for a word", () => {
    const letters = { C: 1, A: 1, T: 1 };
    expect(canAffordWord(letters, "CAT")).toBe(true);
    expect(consumeLetters(letters, "CAT")).toEqual({});
    expect(canAffordWord(letters, "CAR")).toBe(false);
  });

  it("spells a word and persists inventory changes", () => {
    const snap = {
      ...emptyGardenSnapshot(1000),
      letters: { C: 1, A: 1, T: 1 },
      spellingLevel: 1 as const,
      spelledAtLevel: [],
    };
    setGardenSnapshot(snap);

    const result = trySpellWord(snap, "CAT", 2000);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.word).toBe("CAT");
    expect(result.itemUnlocked).toBeUndefined();
    expect(result.snapshot.letters).toEqual({});
    expect(result.snapshot.items.watering_can).toBeUndefined();
    expect(result.snapshot.spelledAtLevel).toEqual(["CAT"]);
    expect(result.snapshot.spelledWords).toEqual(["CAT"]);
  });

  it("unlocks watering can when Sprout spelling level is complete", () => {
    const level1Words = getGardenSpellingLevel(1).words;
    const lastWord = level1Words[level1Words.length - 1]!;
    const spelledAtLevel = level1Words.slice(0, -1);
    const letters: Record<string, number> = {};
    for (const ch of lastWord) {
      letters[ch] = (letters[ch] ?? 0) + 1;
    }

    const snap = {
      ...emptyGardenSnapshot(1000),
      letters,
      spellingLevel: 1 as const,
      spelledAtLevel,
    };

    const result = trySpellWord(snap, lastWord, 2000);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.levelComplete).toBe(true);
    expect(result.advancedToLevel).toBe(2);
    expect(result.itemUnlocked).toBe("watering_can");
    expect(result.snapshot.items.watering_can).toBe(1);
    expect(result.snapshot.spelledAtLevel).toEqual([]);
    expect(result.snapshot.spellingLevel).toBe(2);
  });

  it("unlocks fertilizer when Bud spelling level is complete", () => {
    const level2Words = getGardenSpellingLevel(2).words;
    const lastWord = level2Words[level2Words.length - 1]!;
    const spelledAtLevel = level2Words.slice(0, -1);
    const letters: Record<string, number> = {};
    for (const ch of lastWord) {
      letters[ch] = (letters[ch] ?? 0) + 1;
    }

    const snap = {
      ...emptyGardenSnapshot(1000),
      letters,
      spellingLevel: 2 as const,
      spelledAtLevel,
      items: { watering_can: 1 },
    };

    const result = trySpellWord(snap, lastWord, 2000);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.levelComplete).toBe(true);
    expect(result.advancedToLevel).toBe(3);
    expect(result.itemUnlocked).toBe("fertilizer");
    expect(result.snapshot.items.fertilizer).toBe(1);
    expect(result.snapshot.spellingLevel).toBe(3);
  });

  it("rejects words already spelled at this level", () => {
    const snap = {
      ...emptyGardenSnapshot(1000),
      letters: { C: 2, A: 2, T: 2 },
      spelledAtLevel: ["CAT"],
      spelledWords: ["CAT"],
    };
    const result = trySpellWord(snap, "CAT");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("already_spelled");
  });

  it("rejects words not on the current level list", () => {
    const snap = {
      ...emptyGardenSnapshot(1000),
      letters: { F: 1, I: 1, S: 1, H: 1 },
      spellingLevel: 1 as const,
    };
    const result = trySpellWord(snap, "FISH");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("not_in_level");
  });
});

describe("garden meta", () => {
  it("registers language_garden at level 2", () => {
    expect(minLevelForUnlock("language_garden")).toBe(2);
  });
});

describe("garden daily quests", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    installLocalStorage();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function questProgress(id: string): number {
    const raw = localStorage.getItem(DAILY_QUESTS_STORAGE_KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as { progress?: Record<string, number> };
    return parsed.progress?.[id] ?? 0;
  }

  it("bumps garden_harvests on successful harvest", () => {
    const plantedAt = 1000;
    const now = plantedAt + GROW_MS_BY_TIER.common + 1;
    let snap = emptyGardenSnapshot(plantedAt);
    const planted = plantSeedAt(snap, 0, 0, plantedAt);
    if (!planted.ok) throw new Error("plant failed");
    const harvested = harvestAt(planted.snapshot, 0, 0, now);
    expect(harvested.ok).toBe(true);
    expect(questProgress("garden_harvests")).toBe(1);
  });

  it("bumps garden_words on successful spell", () => {
    const snap = {
      ...emptyGardenSnapshot(1000),
      letters: { C: 1, A: 1, T: 1 },
      spellingLevel: 1 as const,
      spelledAtLevel: [],
    };
    setGardenSnapshot(snap);
    const result = trySpellWord(snap, "CAT", 2000);
    expect(result.ok).toBe(true);
    expect(questProgress("garden_words")).toBe(1);
  });

  it("does not bump garden_words on failed spell", () => {
    const snap = {
      ...emptyGardenSnapshot(1000),
      letters: { C: 1 },
      spellingLevel: 1 as const,
      spelledAtLevel: [],
    };
    const result = trySpellWord(snap, "CAT");
    expect(result.ok).toBe(false);
    expect(questProgress("garden_words")).toBe(0);
  });
});

describe("garden quiz rewards", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    installLocalStorage();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("grants one seed per unique quiz event", () => {
    getGardenSnapshot();
    const afterFirst = grantGardenSeedForQuiz("lesson-1:screen-2:pass");
    expect(afterFirst.seedPouch.length).toBe(STARTER_SEED_COUNT + 1);

    const afterDuplicate = grantGardenSeedForQuiz("lesson-1:screen-2:pass");
    expect(afterDuplicate.seedPouch.length).toBe(STARTER_SEED_COUNT + 1);
  });

  it("grants multiple seeds for different quiz events", () => {
    getGardenSnapshot();
    grantGardenSeedForQuiz("lesson-1:q1:pass");
    grantGardenSeedForQuiz("lesson-1:q2:pass");
    const snap = grantGardenSeedForQuiz("lesson-1:complete", { tier: "bonus" });

    expect(snap.seedPouch.length).toBe(STARTER_SEED_COUNT + 3);
    expect(snap.seedPouch.some((s) => s.tier === "bonus")).toBe(true);
  });
});

describe("garden persistence", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    installLocalStorage();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("creates a 4x4 garden on first load", () => {
    const snap = getGardenSnapshot();
    expect(snap.gridRows).toBe(GARDEN_GRID_ROWS);
    expect(snap.gridCols).toBe(GARDEN_GRID_COLS);
    expect(snap.plots).toHaveLength(GARDEN_GRID_ROWS * GARDEN_GRID_COLS);
    expect(snap.seedPouch.length).toBe(STARTER_SEED_COUNT);
  });

  it("keeps growth progress after leaving and returning", () => {
    const plantedAt = 10_000;
    let snap = getGardenSnapshot();
    const plantResult = plantSeedAt(snap, 2, 2, plantedAt);
    if (!plantResult.ok) throw new Error("plant failed");
    snap = plantResult.snapshot;
    setGardenSnapshot(snap);

    const later = plantedAt + 30_000;
    const reloaded = getGardenSnapshot();
    const plot = reloaded.plots.find((p) => p.row === 2 && p.col === 2);
    expect(plot?.plantedAt).toBe(plantedAt);
    expect(resolveGrowthStage(plot!, later, "common")).toBe("sprout");
    expect(localStorage.getItem(GARDEN_STORAGE_KEY)).toContain(String(plantedAt));
  });
});
