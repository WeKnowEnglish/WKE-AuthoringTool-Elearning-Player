import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { plantSeedAt } from "@/lib/garden/actions";
import {
  emptyGardenSnapshot,
  WEED_MONSTER_BASE_SPAWN_CHANCE,
  WEED_MONSTER_EMPTY_BOOST_MAX,
  WEED_MONSTER_MAX_ACTIVE,
} from "@/lib/garden/defaults";
import { GROW_MS_BY_TIER } from "@/lib/garden/growth";
import { getGardenSnapshot, setGardenSnapshot } from "@/lib/garden/storage";
import {
  countActiveWeedMonsters,
  pickWeedMonsterPuzzle,
  pickWeedMonsterWords,
  plotHasWeedMonster,
  reconcileWeedMonsters,
  weedMonsterEmptyRatio,
  weedMonsterSpawnChance,
} from "@/lib/garden/weed-monsters";

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

function plantedPlot(row: number, col: number, plantedAt: number) {
  return {
    row,
    col,
    seedId: "crop-1",
    seedTier: "common" as const,
    plantedAt,
    growMultiplier: 1,
  };
}

describe("weed monsters", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    installLocalStorage();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not spawn monsters during grace period", () => {
    const now = 100_000;
    const snap = {
      ...emptyGardenSnapshot(now),
      totalHarvests: 2,
    };

    const next = reconcileWeedMonsters(snap, now, () => 0);
    expect(countActiveWeedMonsters(next.plots)).toBe(0);
  });

  it("spawns a monster on an empty plot when roll succeeds after grace period", () => {
    const now = 100_000;
    const snap = {
      ...emptyGardenSnapshot(now),
      totalHarvests: 3,
    };

    const next = reconcileWeedMonsters(snap, now, () => 0);
    const occupied = next.plots.filter(plotHasWeedMonster);
    expect(occupied.length).toBeGreaterThan(0);
    const monster = occupied[0]!.weedMonster!;
    expect(monster.words).toHaveLength(3);
    expect(monster.words.every((w) => w.length === 3)).toBe(true);
    expect(monster.letterTray).toHaveLength(9);
    expect(countActiveWeedMonsters(next.plots)).toBe(occupied.length);
  });

  it("only spawns on empty unlocked plots, not on growing crops", () => {
    const now = 100_000;
    const plantedAt = now - GROW_MS_BY_TIER.common / 2;
    const snap = {
      ...emptyGardenSnapshot(now),
      totalHarvests: 5,
      plots: emptyGardenSnapshot(now).plots.map((p, i) =>
        i === 0 ? plantedPlot(0, 0, plantedAt) : p,
      ),
    };

    const next = reconcileWeedMonsters(snap, now, () => 0);
    expect(plotHasWeedMonster(next.plots[0]!)).toBe(false);
    expect(countActiveWeedMonsters(next.plots)).toBeGreaterThan(0);
  });

  it("clears monsters from planted plots on reconcile", () => {
    const now = 100_000;
    const puzzle = pickWeedMonsterPuzzle(emptyGardenSnapshot(now), 0, 0, now, () => 0.5)!;
    const snap = {
      ...emptyGardenSnapshot(now),
      totalHarvests: 5,
      plots: emptyGardenSnapshot(now).plots.map((p, i) =>
        i === 0 ?
          { ...plantedPlot(0, 0, now), weedMonster: puzzle }
        : p,
      ),
    };

    const next = reconcileWeedMonsters(snap, now, () => 1);
    expect(next.plots[0]?.weedMonster).toBeUndefined();
  });

  it(`limits to ${WEED_MONSTER_MAX_ACTIVE} active monsters at a time`, () => {
    const now = 100_000;
    const snap = {
      ...emptyGardenSnapshot(now),
      totalHarvests: 5,
    };

    const next = reconcileWeedMonsters(snap, now, () => 0);
    expect(countActiveWeedMonsters(next.plots)).toBeLessThanOrEqual(WEED_MONSTER_MAX_ACTIVE);
  });

  it("increases spawn chance when more plots are empty", () => {
    const now = 100_000;
    const sparse = emptyGardenSnapshot(now);
    const sparseRatio = weedMonsterEmptyRatio(sparse, now);
    expect(sparseRatio).toBe(1);

    const plantedAt = now - GROW_MS_BY_TIER.common / 2;
    const busy = {
      ...emptyGardenSnapshot(now),
      plots: emptyGardenSnapshot(now).plots.map((p, i) =>
        i < 12 ? plantedPlot(p.row, p.col, plantedAt) : p,
      ),
    };
    const busyRatio = weedMonsterEmptyRatio(busy, now);
    expect(busyRatio).toBeLessThan(sparseRatio);

    const sparseChance = weedMonsterSpawnChance(sparseRatio);
    const busyChance = weedMonsterSpawnChance(busyRatio);
    expect(sparseChance).toBe(WEED_MONSTER_BASE_SPAWN_CHANCE * WEED_MONSTER_EMPTY_BOOST_MAX);
    expect(busyChance).toBeLessThan(sparseChance);
    expect(busyChance).toBeGreaterThan(0);
  });

  it("pickWeedMonsterWords returns three distinct 3-letter words", () => {
    const snap = emptyGardenSnapshot();
    const words = pickWeedMonsterWords(snap, () => 0);
    expect(words).not.toBeNull();
    if (!words) return;
    expect(new Set(words).size).toBe(3);
    expect(words.every((w) => w.length === 3)).toBe(true);
  });

  it("blocks planting while a weed monster occupies the plot", () => {
    const now = 100_000;
    const puzzle = pickWeedMonsterPuzzle(emptyGardenSnapshot(now), 0, 0, now, () => 0.5)!;
    const snap = {
      ...emptyGardenSnapshot(now),
      seedPouch: [
        { id: "s1", tier: "common" as const, grantedAt: now, sourceEventId: "test" },
      ],
      plots: emptyGardenSnapshot(now).plots.map((p, i) =>
        i === 0 ? { ...p, weedMonster: puzzle } : p,
      ),
    };

    const result = plantSeedAt(snap, 0, 0, now);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("weed_monster_blocking");
  });

  it("persists monster reconciliation via getGardenSnapshot", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const now = 100_000;
    const snap = {
      ...emptyGardenSnapshot(now),
      totalHarvests: 5,
    };
    setGardenSnapshot(snap);

    const loaded = getGardenSnapshot();
    expect(countActiveWeedMonsters(loaded.plots)).toBeGreaterThan(0);
  });
});
