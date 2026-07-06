import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  emptyGardenSnapshot,
  STARTER_SEED_COUNT,
  WEED_BATTLE_GOLD_MAX,
  WEED_BATTLE_GOLD_MIN,
  WEED_BATTLE_SEED_REWARD,
  WEED_BATTLE_XP_REWARD,
} from "@/lib/garden/defaults";
import { setGardenSnapshot } from "@/lib/garden/storage";
import { REWARDS_STORAGE_KEY, getRewards } from "@/lib/progress/rewards";
import {
  formatWeedBattleVictoryMessage,
  grantWeedMonsterVictoryRewards,
  hasWeedBattleSeedsInPouch,
  rollWeedBattleGold,
  weedBattleRewardEventId,
  weedBattleSeedEventId,
} from "@/lib/garden/weed-battle-rewards";

function installStorage() {
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

describe("weed battle reward helpers", () => {
  it("builds stable event ids", () => {
    expect(weedBattleRewardEventId("weed:0,0:1")).toBe("weed-battle:weed:0,0:1");
    expect(weedBattleSeedEventId("weed:0,0:1", 2)).toBe("weed-battle:weed:0,0:1:seed:2");
  });

  it("rolls gold within the configured range", () => {
    expect(rollWeedBattleGold(() => 0)).toBe(WEED_BATTLE_GOLD_MIN);
    expect(rollWeedBattleGold(() => 0.999)).toBe(WEED_BATTLE_GOLD_MAX);
    expect(rollWeedBattleGold(() => 0.5)).toBeGreaterThanOrEqual(WEED_BATTLE_GOLD_MIN);
    expect(rollWeedBattleGold(() => 0.5)).toBeLessThanOrEqual(WEED_BATTLE_GOLD_MAX);
  });

  it("formats victory messages from reward totals", () => {
    expect(
      formatWeedBattleVictoryMessage({
        seedsGranted: 3,
        goldGranted: 5,
        experienceGranted: 5,
        duplicate: false,
      }),
    ).toBe("You defeated the weed monster! +3 seeds, +5 gold, +5 XP!");

    expect(
      formatWeedBattleVictoryMessage({
        seedsGranted: 0,
        goldGranted: 0,
        experienceGranted: 0,
        duplicate: true,
      }),
    ).toBe("You defeated the weed monster! The plot is yours.");
  });
});

describe("grantWeedMonsterVictoryRewards", () => {
  const puzzleId = "weed:0,0:1";
  const now = 100_000;

  beforeEach(() => {
    vi.restoreAllMocks();
    installStorage();
    seedRewards();
    setGardenSnapshot(emptyGardenSnapshot(now));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("grants seeds, gold, and XP on first victory", () => {
    const snap = emptyGardenSnapshot(now);
    const { snapshot, rewards } = grantWeedMonsterVictoryRewards(snap, puzzleId, now, () => 0.5);

    expect(rewards).toEqual({
      seedsGranted: WEED_BATTLE_SEED_REWARD,
      goldGranted: rollWeedBattleGold(() => 0.5),
      experienceGranted: WEED_BATTLE_XP_REWARD,
      duplicate: false,
    });
    expect(snapshot.seedPouch).toHaveLength(STARTER_SEED_COUNT + WEED_BATTLE_SEED_REWARD);
    expect(
      snapshot.seedPouch
        .slice(STARTER_SEED_COUNT)
        .every((seed) => seed.tier === "common" && seed.sourceEventId.includes(puzzleId)),
    ).toBe(true);
    expect(getRewards().gold).toBe(rewards.goldGranted);
    expect(getRewards().experience).toBe(WEED_BATTLE_XP_REWARD);
    expect(getRewards().rewardedEventIds).toContain(weedBattleRewardEventId(puzzleId));
  });

  it("skips duplicate gold and XP when the reward event was already claimed", () => {
    const snap = emptyGardenSnapshot(now);
    grantWeedMonsterVictoryRewards(snap, puzzleId, now, () => 0);
    const firstGold = getRewards().gold;

    const withSeeds = {
      ...emptyGardenSnapshot(now),
      seedPouch: emptyGardenSnapshot(now).seedPouch,
    };
    const replay = grantWeedMonsterVictoryRewards(withSeeds, puzzleId, now + 1, () => 0.99);

    expect(replay.rewards.duplicate).toBe(true);
    expect(replay.rewards.seedsGranted).toBe(0);
    expect(replay.rewards.goldGranted).toBe(0);
    expect(getRewards().gold).toBe(firstGold);
    expect(hasWeedBattleSeedsInPouch(replay.snapshot, puzzleId)).toBe(false);
  });

  it("skips seed grants when pouch already has seeds for the puzzle", () => {
    const snap = {
      ...emptyGardenSnapshot(now),
      seedPouch: [
        ...emptyGardenSnapshot(now).seedPouch,
        {
          id: "existing-seed",
          tier: "common" as const,
          grantedAt: now,
          sourceEventId: weedBattleSeedEventId(puzzleId, 0),
        },
      ],
    };

    const { snapshot, rewards } = grantWeedMonsterVictoryRewards(snap, puzzleId, now, () => 0);
    expect(rewards.seedsGranted).toBe(0);
    expect(snapshot.seedPouch).toHaveLength(STARTER_SEED_COUNT + 1);
    expect(getRewards().gold).toBeGreaterThan(0);
  });
});
