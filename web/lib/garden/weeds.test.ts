import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { harvestAt, plantSeedAt, tryClearWeedAt } from "@/lib/garden/actions";
import { emptyGardenSnapshot } from "@/lib/garden/defaults";
import { GROW_MS_BY_TIER, resolveGrowthStage } from "@/lib/garden/growth";
import { getGardenSnapshot, setGardenSnapshot } from "@/lib/garden/storage";
import {
  countActiveWeeds,
  pickWeedWord,
  plotHasWeed,
  reconcileWeeds,
} from "@/lib/garden/weeds";
import { DAILY_QUESTS_STORAGE_KEY } from "@/lib/teststartpage/daily-quests";

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

function readyPlot(row: number, col: number, plantedAt: number) {
  return {
    row,
    col,
    seedId: "crop-1",
    seedTier: "common" as const,
    plantedAt,
    growMultiplier: 1,
  };
}

describe("weeds", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    installLocalStorage();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not spawn weeds during grace period", () => {
    const now = 100_000;
    const plantedAt = now - GROW_MS_BY_TIER.common - 1;
    const snap = {
      ...emptyGardenSnapshot(now),
      totalHarvests: 2,
      plots: emptyGardenSnapshot(now).plots.map((p, i) =>
        i === 0 ? readyPlot(0, 0, plantedAt) : p,
      ),
    };

    const next = reconcileWeeds(snap, now, () => 0);
    const plot = next.plots[0]!;
    expect(plot.weedRollDone).toBe(true);
    expect(plot.weedWord).toBeUndefined();
    expect(countActiveWeeds(next.plots)).toBe(0);
  });

  it("spawns a weed when roll succeeds after grace period", () => {
    const now = 100_000;
    const plantedAt = now - GROW_MS_BY_TIER.common - 1;
    const snap = {
      ...emptyGardenSnapshot(now),
      totalHarvests: 3,
      plots: emptyGardenSnapshot(now).plots.map((p, i) =>
        i === 0 ? readyPlot(0, 0, plantedAt) : p,
      ),
    };

    const next = reconcileWeeds(snap, now, () => 0);
    const plot = next.plots[0]!;
    expect(plot.weedRollDone).toBe(true);
    expect(plot.weedWord).toMatch(/^[A-Z]{3,4}$/);
    expect(countActiveWeeds(next.plots)).toBe(1);
  });

  it("does not re-roll after weedRollDone is set", () => {
    const now = 100_000;
    const plantedAt = now - GROW_MS_BY_TIER.common - 1;
    const snap = {
      ...emptyGardenSnapshot(now),
      totalHarvests: 5,
      plots: emptyGardenSnapshot(now).plots.map((p, i) =>
        i === 0 ?
          { ...readyPlot(0, 0, plantedAt), weedRollDone: true, weedWord: "CAT" }
        : p,
      ),
    };

    const next = reconcileWeeds(snap, now, () => 0);
    expect(next.plots[0]?.weedWord).toBe("CAT");
  });

  it("limits to one active weed at a time", () => {
    const now = 100_000;
    const plantedAt = now - GROW_MS_BY_TIER.common - 1;
    const snap = {
      ...emptyGardenSnapshot(now),
      totalHarvests: 5,
      plots: emptyGardenSnapshot(now).plots.map((p, i) => {
        if (i === 0) return { ...readyPlot(0, 0, plantedAt), weedWord: "DOG" };
        if (i === 1) return readyPlot(0, 1, plantedAt);
        return p;
      }),
    };

    const next = reconcileWeeds(snap, now, () => 0);
    expect(next.plots[0]?.weedWord).toBe("DOG");
    expect(next.plots[1]?.weedWord).toBeUndefined();
    expect(next.plots[1]?.weedRollDone).toBe(true);
  });

  it("pickWeedWord prefers unspelled words at the current level", () => {
    const snap = {
      ...emptyGardenSnapshot(),
      spellingLevel: 1 as const,
      spelledAtLevel: ["CAT"],
    };
    const words = new Set<string>();
    for (let i = 0; i < 20; i++) {
      const word = pickWeedWord(snap, () => 0);
      if (word) words.add(word);
    }
    expect(words.has("CAT")).toBe(false);
    expect(words.size).toBeGreaterThan(0);
  });

  it("clears weed on exact word match", () => {
    const now = 100_000;
    const plantedAt = now - GROW_MS_BY_TIER.common - 1;
    let snap = {
      ...emptyGardenSnapshot(now),
      plots: emptyGardenSnapshot(now).plots.map((p, i) =>
        i === 0 ?
          { ...readyPlot(0, 0, plantedAt), weedWord: "CAT", weedRollDone: true }
        : p,
      ),
    };
    setGardenSnapshot(snap);

    const cleared = tryClearWeedAt(snap, 0, 0, "cat", now);
    expect(cleared.ok).toBe(true);
    if (!cleared.ok) return;
    expect(cleared.snapshot.plots[0]?.weedWord).toBeNull();
    expect(resolveGrowthStage(cleared.snapshot.plots[0]!, now, "common")).toBe("ready");
  });

  it("rejects wrong weed word", () => {
    const now = 100_000;
    const plantedAt = now - GROW_MS_BY_TIER.common - 1;
    const snap = {
      ...emptyGardenSnapshot(now),
      plots: emptyGardenSnapshot(now).plots.map((p, i) =>
        i === 0 ?
          { ...readyPlot(0, 0, plantedAt), weedWord: "CAT", weedRollDone: true }
        : p,
      ),
    };

    const result = tryClearWeedAt(snap, 0, 0, "DOG", now);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("word_mismatch");
  });

  it("blocks harvest while weed is present", () => {
    const now = 100_000;
    const plantedAt = now - GROW_MS_BY_TIER.common - 1;
    const snap = {
      ...emptyGardenSnapshot(now),
      plots: emptyGardenSnapshot(now).plots.map((p, i) =>
        i === 0 ?
          { ...readyPlot(0, 0, plantedAt), weedWord: "CAT", weedRollDone: true }
        : p,
      ),
    };

    const result = harvestAt(snap, 0, 0, now);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("weed_blocking");
  });

  it("increments totalHarvests on successful harvest", () => {
    vi.spyOn(Math, "random").mockReturnValue(1);
    const snap = emptyGardenSnapshot(1000);
    const planted = plantSeedAt(snap, 0, 0, 1000);
    if (!planted.ok) throw new Error("plant failed");

    const readyAt = 1000 + GROW_MS_BY_TIER.common;
    const harvested = harvestAt(planted.snapshot, 0, 0, readyAt);
    expect(harvested.ok).toBe(true);
    if (!harvested.ok) return;
    expect(harvested.snapshot.totalHarvests).toBe(1);
  });

  it("bumps garden_weeds_cleared quest on clear", () => {
    const now = 100_000;
    const plantedAt = now - GROW_MS_BY_TIER.common - 1;
    const snap = {
      ...emptyGardenSnapshot(now),
      plots: emptyGardenSnapshot(now).plots.map((p, i) =>
        i === 0 ?
          { ...readyPlot(0, 0, plantedAt), weedWord: "CAT", weedRollDone: true }
        : p,
      ),
    };
    setGardenSnapshot(snap);

    tryClearWeedAt(snap, 0, 0, "CAT", now);
    const raw = localStorage.getItem(DAILY_QUESTS_STORAGE_KEY);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!) as { progress: Record<string, number> };
    expect(parsed.progress.garden_weeds_cleared).toBe(1);
  });

  it("persists weed reconciliation via getGardenSnapshot", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const now = 100_000;
    const plantedAt = now - GROW_MS_BY_TIER.common - 1;
    const snap = {
      ...emptyGardenSnapshot(now),
      totalHarvests: 5,
      plots: emptyGardenSnapshot(now).plots.map((p, i) =>
        i === 0 ? readyPlot(0, 0, plantedAt) : p,
      ),
    };
    setGardenSnapshot(snap);

    const loaded = getGardenSnapshot();
    expect(loaded.plots[0]?.weedRollDone).toBe(true);
    expect(plotHasWeed(loaded.plots[0]!)).toBe(true);
  });
});
