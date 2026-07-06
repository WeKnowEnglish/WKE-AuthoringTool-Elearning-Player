import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  plantSeedAt,
  startWeedMonsterBattle,
  tryDefeatWeedMonster,
} from "@/lib/garden/actions";
import {
  emptyGardenSnapshot,
  STARTER_SEED_COUNT,
  WEED_BATTLE_FAIL_COOLDOWN_MS,
  WEED_BATTLE_SEED_REWARD,
  WEED_BATTLE_XP_REWARD,
} from "@/lib/garden/defaults";
import { getGardenSnapshot, setGardenSnapshot } from "@/lib/garden/storage";
import { REWARDS_STORAGE_KEY, getRewards } from "@/lib/progress/rewards";
import {
  countActiveWeedMonsters,
  plotHasWeedMonster,
  reconcileWeedMonsters,
} from "@/lib/garden/weed-monsters";
import { weedBattleRewardEventId, grantWeedMonsterVictoryRewards } from "@/lib/garden/weed-battle-rewards";
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

function monsterPlotIndex(snapshot: ReturnType<typeof emptyGardenSnapshot>) {
  return snapshot.plots.findIndex((plot) => plotHasWeedMonster(plot));
}

describe("weed monster integration", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    installLocalStorage();
    seedRewards();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("runs spawn → battle → victory → plant on the cleared plot", () => {
    const now = 100_000;
    const spawned = reconcileWeedMonsters(
      { ...emptyGardenSnapshot(now), totalHarvests: 5 },
      now,
      () => 0,
    );
    const plotIndex = monsterPlotIndex(spawned);
    expect(plotIndex).toBeGreaterThanOrEqual(0);

    const plot = spawned.plots[plotIndex]!;
    const puzzle = plot.weedMonster!;
    const started = startWeedMonsterBattle(spawned, plot.row, plot.col, now);
    expect(started.ok).toBe(true);
    if (!started.ok) return;

    const victory = tryDefeatWeedMonster(
      started.snapshot,
      plot.row,
      plot.col,
      puzzle.words,
      now,
    );
    expect(victory.ok).toBe(true);
    if (!victory.ok) return;

    expect(plotHasWeedMonster(victory.snapshot.plots[plotIndex]!)).toBe(false);
    expect(victory.snapshot.seedPouch).toHaveLength(STARTER_SEED_COUNT + WEED_BATTLE_SEED_REWARD);
    expect(victory.rewards.experienceGranted).toBe(WEED_BATTLE_XP_REWARD);
    expect(getRewards().experience).toBe(WEED_BATTLE_XP_REWARD);

    const planted = plantSeedAt(victory.snapshot, plot.row, plot.col, now);
    expect(planted.ok).toBe(true);
  });

  it("blocks planting until the monster is defeated", () => {
    const now = 100_000;
    const spawned = reconcileWeedMonsters(
      { ...emptyGardenSnapshot(now), totalHarvests: 5 },
      now,
      () => 0,
    );
    const plotIndex = monsterPlotIndex(spawned);
    const plot = spawned.plots[plotIndex]!;

    const blocked = plantSeedAt(spawned, plot.row, plot.col, now);
    expect(blocked.ok).toBe(false);
    if (blocked.ok) return;
    expect(blocked.reason).toBe("weed_monster_blocking");
  });

  it("allows retry after a failed battle cooldown expires", () => {
    const now = 100_000;
    const puzzle: WeedMonsterPuzzle = {
      puzzleId: "weed:0,0:1",
      words: ["CAT", "DOG", "HEN"],
      letterTray: ["C", "A", "T", "D", "O", "G", "H", "E", "N"],
      battleStartedAt: now,
    };
    const snap = {
      ...emptyGardenSnapshot(now),
      plots: emptyGardenSnapshot(now).plots.map((p, i) =>
        i === 0 ? { ...p, weedMonster: puzzle } : p,
      ),
    };

    const failed = tryDefeatWeedMonster(snap, 0, 0, ["ACT", "DOG", "HEN"], now);
    expect(failed.ok).toBe(false);
    if (failed.ok) return;

    const cooledAt = now + WEED_BATTLE_FAIL_COOLDOWN_MS;
    const restarted = startWeedMonsterBattle(failed.snapshot!, 0, 0, cooledAt);
    expect(restarted.ok).toBe(true);
  });

  it("does not double-grant rewards for the same puzzle id", () => {
    const now = 100_000;
    const puzzleId = "weed:0,0:dup";
    const snap = emptyGardenSnapshot(now);

    const first = grantWeedMonsterVictoryRewards(snap, puzzleId, now, () => 0);
    expect(first.rewards.duplicate).toBe(false);
    expect(getRewards().rewardedEventIds).toContain(weedBattleRewardEventId(puzzleId));

    const goldAfterFirst = getRewards().gold;
    const seedsAfterFirst = first.snapshot.seedPouch.length;

    const second = grantWeedMonsterVictoryRewards(first.snapshot, puzzleId, now + 1, () => 0.99);
    expect(second.rewards.duplicate).toBe(true);
    expect(second.rewards.seedsGranted).toBe(0);
    expect(second.rewards.goldGranted).toBe(0);
    expect(getRewards().gold).toBe(goldAfterFirst);
    expect(second.snapshot.seedPouch.length).toBe(seedsAfterFirst);
  });

  it("reconciles monsters when loading garden state from storage", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const now = 100_000;
    setGardenSnapshot({
      ...emptyGardenSnapshot(now),
      totalHarvests: 5,
    });

    const loaded = getGardenSnapshot();
    expect(countActiveWeedMonsters(loaded.plots)).toBeGreaterThan(0);
  });
});
