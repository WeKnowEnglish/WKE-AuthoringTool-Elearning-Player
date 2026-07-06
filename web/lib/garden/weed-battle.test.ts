import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  abandonWeedMonsterBattle,
  failWeedMonsterBattle,
  plantSeedAt,
  startWeedMonsterBattle,
  tryDefeatWeedMonster,
} from "@/lib/garden/actions";
import {
  emptyGardenSnapshot,
  STARTER_SEED_COUNT,
  WEED_BATTLE_FAIL_COOLDOWN_MS,
  WEED_BATTLE_SEED_REWARD,
  WEED_BATTLE_TIME_MS,
  WEED_BATTLE_XP_REWARD,
} from "@/lib/garden/defaults";
import { setGardenSnapshot } from "@/lib/garden/storage";
import { REWARDS_STORAGE_KEY, getRewards } from "@/lib/progress/rewards";
import {
  formatWeedMonsterCooldown,
  isWeedBattleExpired,
  isWeedMonsterOnCooldown,
  normalizeWordSlots,
  validateWeedBattleSolution,
  weedBattleRemainingMs,
  weedMonsterCooldownRemainingMs,
} from "@/lib/garden/weed-battle";
import { plotHasWeedMonster } from "@/lib/garden/weed-monsters";
import { DAILY_QUESTS_STORAGE_KEY } from "@/lib/teststartpage/daily-quests";
import type { WeedMonsterPuzzle } from "@/lib/garden/types";

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

function seedRewards() {
  localStorage.setItem(
    REWARDS_STORAGE_KEY,
    JSON.stringify({
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
    }),
  );
}

function samplePuzzle(overrides: Partial<WeedMonsterPuzzle> = {}): WeedMonsterPuzzle {
  return {
    puzzleId: "weed:0,0:1",
    words: ["CAT", "DOG", "HEN"],
    letterTray: ["C", "A", "T", "D", "O", "G", "H", "E", "N"],
    ...overrides,
  };
}

function snapWithMonster(puzzle: WeedMonsterPuzzle, now = 100_000) {
  return {
    ...emptyGardenSnapshot(now),
    plots: emptyGardenSnapshot(now).plots.map((p, i) =>
      i === 0 ? { ...p, weedMonster: puzzle } : p,
    ),
  };
}

describe("weed battle validation", () => {
  const puzzle = samplePuzzle();

  it("accepts any permutation of the target words", () => {
    expect(validateWeedBattleSolution(puzzle, ["HEN", "CAT", "DOG"])).toBe(true);
    expect(validateWeedBattleSolution(puzzle, ["DOG", "HEN", "CAT"])).toBe(true);
  });

  it("rejects wrong words with the same letters", () => {
    expect(validateWeedBattleSolution(puzzle, ["ACT", "DOG", "HEN"])).toBe(false);
  });

  it("rejects the wrong letter multiset", () => {
    expect(validateWeedBattleSolution(puzzle, ["CAT", "DOG", "HAT"])).toBe(false);
  });

  it("rejects invalid slot lengths", () => {
    expect(normalizeWordSlots(["CA", "DOG", "HEN"])).toBeNull();
    expect(normalizeWordSlots(["CAT", "DOGS", "HEN"])).toBeNull();
    expect(normalizeWordSlots(["CAT", "DOG"])).toBeNull();
  });

  it("normalizes lowercase submissions", () => {
    expect(normalizeWordSlots(["cat", "dog", "hen"])).toEqual(["CAT", "DOG", "HEN"]);
  });

  it("handles puzzles with duplicate letters in the tray", () => {
    const duped = samplePuzzle({
      words: ["EEL", "EEL", "NET"],
      letterTray: ["E", "E", "L", "E", "E", "L", "N", "E", "T"],
    });
    expect(validateWeedBattleSolution(duped, ["EEL", "NET", "EEL"])).toBe(true);
    expect(validateWeedBattleSolution(duped, ["EEL", "EEL", "TEN"])).toBe(false);
  });

  it("tracks cooldown and battle expiry helpers", () => {
    const now = 10_000;
    const onCooldown = {
      row: 0,
      col: 0,
      seedId: null,
      seedTier: null,
      plantedAt: null,
      growMultiplier: 1,
      weedMonster: samplePuzzle({ cooldownUntil: now + 2_000 }),
    };
    expect(isWeedMonsterOnCooldown(onCooldown, now)).toBe(true);
    expect(weedMonsterCooldownRemainingMs(onCooldown, now)).toBe(2_000);
    expect(formatWeedMonsterCooldown(2_000)).toBe("2s");
    expect(formatWeedMonsterCooldown(0)).toBe("Ready!");

    const started = samplePuzzle({ battleStartedAt: now - WEED_BATTLE_TIME_MS - 1 });
    expect(isWeedBattleExpired(started, now)).toBe(true);

    const active = samplePuzzle({ battleStartedAt: now - 5_000 });
    expect(weedBattleRemainingMs(active, now)).toBe(WEED_BATTLE_TIME_MS - 5_000);
  });
});

describe("weed battle actions", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    installLocalStorage();
    seedRewards();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("starts a battle by recording battleStartedAt", () => {
    const now = 100_000;
    const snap = snapWithMonster(samplePuzzle(), now);
    const started = startWeedMonsterBattle(snap, 0, 0, now);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    expect(started.snapshot.plots[0]?.weedMonster?.battleStartedAt).toBe(now);
  });

  it("blocks starting a battle while on cooldown", () => {
    const now = 100_000;
    const snap = snapWithMonster(samplePuzzle({ cooldownUntil: now + 1_000 }), now);
    const started = startWeedMonsterBattle(snap, 0, 0, now);
    expect(started.ok).toBe(false);
    if (started.ok) return;
    expect(started.reason).toBe("on_cooldown");
  });

  it("defeats a monster when all three words are correct", () => {
    const now = 100_000;
    const snap = snapWithMonster(samplePuzzle(), now);
    setGardenSnapshot(snap);

    const result = tryDefeatWeedMonster(snap, 0, 0, ["CAT", "DOG", "HEN"], now);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(plotHasWeedMonster(result.snapshot.plots[0]!)).toBe(false);
    expect(result.snapshot.seedPouch).toHaveLength(STARTER_SEED_COUNT + WEED_BATTLE_SEED_REWARD);
    expect(result.rewards.seedsGranted).toBe(WEED_BATTLE_SEED_REWARD);
    expect(result.rewards.goldGranted).toBeGreaterThanOrEqual(2);
    expect(result.rewards.goldGranted).toBeLessThanOrEqual(8);
    expect(result.rewards.experienceGranted).toBe(WEED_BATTLE_XP_REWARD);
    expect(getRewards().gold).toBe(result.rewards.goldGranted);
    expect(getRewards().experience).toBe(WEED_BATTLE_XP_REWARD);

    const planted = plantSeedAt(result.snapshot, 0, 0, now);
    expect(planted.ok).toBe(true);
  });

  it("applies cooldown on a wrong answer without clearing the monster", () => {
    const now = 100_000;
    const snap = snapWithMonster(samplePuzzle({ battleStartedAt: now }), now);
    const result = tryDefeatWeedMonster(snap, 0, 0, ["ACT", "DOG", "HEN"], now);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("wrong_answer");
    expect(result.snapshot?.plots[0]?.weedMonster?.cooldownUntil).toBe(
      now + WEED_BATTLE_FAIL_COOLDOWN_MS,
    );
    expect(result.snapshot?.plots[0]?.weedMonster?.battleStartedAt).toBeUndefined();
    expect(plotHasWeedMonster(result.snapshot!.plots[0]!)).toBe(true);
  });

  it("does not apply cooldown on invalid submissions", () => {
    const now = 100_000;
    const puzzle = samplePuzzle({ battleStartedAt: now });
    const snap = snapWithMonster(puzzle, now);
    const result = tryDefeatWeedMonster(snap, 0, 0, ["CA", "DOG", "HEN"], now);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("invalid_submission");
    expect(snap.plots[0]?.weedMonster?.cooldownUntil).toBeUndefined();
  });

  it("expires battles that run past the timer", () => {
    const now = 100_000;
    const snap = snapWithMonster(
      samplePuzzle({ battleStartedAt: now - WEED_BATTLE_TIME_MS - 1 }),
      now,
    );
    const result = tryDefeatWeedMonster(snap, 0, 0, ["CAT", "DOG", "HEN"], now);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("battle_expired");
    expect(result.snapshot?.plots[0]?.weedMonster?.cooldownUntil).toBe(
      now + WEED_BATTLE_FAIL_COOLDOWN_MS,
    );
  });

  it("records timeout failures via failWeedMonsterBattle", () => {
    const now = 100_000;
    const snap = snapWithMonster(samplePuzzle({ battleStartedAt: now }), now);
    const failed = failWeedMonsterBattle(snap, 0, 0, now, "timeout");
    expect(failed.ok).toBe(true);
    if (!failed.ok) return;
    expect(failed.snapshot.plots[0]?.weedMonster?.cooldownUntil).toBe(
      now + WEED_BATTLE_FAIL_COOLDOWN_MS,
    );
  });

  it("bumps garden_weeds_cleared quest on victory", () => {
    const now = 100_000;
    const snap = snapWithMonster(samplePuzzle(), now);
    setGardenSnapshot(snap);

    tryDefeatWeedMonster(snap, 0, 0, ["HEN", "DOG", "CAT"], now);
    const raw = localStorage.getItem(DAILY_QUESTS_STORAGE_KEY);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!) as { progress: Record<string, number> };
    expect(parsed.progress.garden_weeds_cleared).toBe(1);
  });

  it("abandon clears battleStartedAt without applying cooldown", () => {
    const now = 100_000;
    const snap = snapWithMonster(samplePuzzle({ battleStartedAt: now }), now);
    const abandoned = abandonWeedMonsterBattle(snap, 0, 0, now);
    expect(abandoned.ok).toBe(true);
    if (!abandoned.ok) return;
    expect(abandoned.snapshot.plots[0]?.weedMonster?.battleStartedAt).toBeUndefined();
    expect(abandoned.snapshot.plots[0]?.weedMonster?.cooldownUntil).toBeUndefined();
    expect(plotHasWeedMonster(abandoned.snapshot.plots[0]!)).toBe(true);
  });
});
