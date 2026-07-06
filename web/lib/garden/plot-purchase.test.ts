import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { plantSeedAt } from "@/lib/garden/actions";
import { emptyGardenSnapshot, GARDEN_STORAGE_KEY } from "@/lib/garden/defaults";
import { purchaseGrassPlotAt } from "@/lib/garden/plot-purchase";
import { getGardenSnapshot, setGardenSnapshot } from "@/lib/garden/storage";
import { REWARDS_STORAGE_KEY, getRewards } from "@/lib/progress/rewards";

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

function seedRewards(gold: number) {
  localStorage.setItem(
    REWARDS_STORAGE_KEY,
    JSON.stringify({
      gold,
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

describe("purchaseGrassPlotAt", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    installStorage();
    setGardenSnapshot(emptyGardenSnapshot(1000));
    seedRewards(100);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("purchases a grass plot and deducts gold", () => {
    const snap = getGardenSnapshot();
    const result = purchaseGrassPlotAt(snap, 1, 2, 2000);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.cost).toBe(25);
    expect(result.goldRemaining).toBe(75);
    expect(result.plotKey).toBe("1,2");
    expect(getRewards().gold).toBe(75);
    expect(getGardenSnapshot().purchasedPlotKeys).toEqual(["1,2"]);
  });

  it("doubles the cost for each additional grass plot", () => {
    let snap = getGardenSnapshot();
    seedRewards(200);

    const first = purchaseGrassPlotAt(snap, 1, 0, 2000);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.cost).toBe(25);

    snap = getGardenSnapshot();
    const second = purchaseGrassPlotAt(snap, 2, 3, 3000);
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.cost).toBe(50);
    expect(getRewards().gold).toBe(125);
  });

  it("rejects insufficient gold without unlocking", () => {
    seedRewards(10);
    const snap = getGardenSnapshot();
    const result = purchaseGrassPlotAt(snap, 1, 1, 2000);

    expect(result).toEqual({ ok: false, reason: "insufficient_gold", cost: 25 });
    expect(getGardenSnapshot().purchasedPlotKeys).toEqual([]);
    expect(getRewards().gold).toBe(10);
  });

  it("rejects row 0 and already unlocked grass", () => {
    const snap = getGardenSnapshot();
    expect(purchaseGrassPlotAt(snap, 0, 0)).toEqual({ ok: false, reason: "not_grass" });

    const unlocked = purchaseGrassPlotAt(snap, 1, 0);
    expect(unlocked.ok).toBe(true);

    const snap2 = getGardenSnapshot();
    expect(purchaseGrassPlotAt(snap2, 1, 0)).toEqual({ ok: false, reason: "already_unlocked" });
  });
});

describe("plot_locked actions", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    installStorage();
    setGardenSnapshot(emptyGardenSnapshot(1000));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("blocks planting on locked grass", () => {
    const snap = getGardenSnapshot();
    const result = plantSeedAt(snap, 1, 0, 1000);
    expect(result).toEqual({ ok: false, reason: "plot_locked" });
  });

  it("allows planting on free top-row dirt", () => {
    const snap = getGardenSnapshot();
    const result = plantSeedAt(snap, 0, 0, 1000);
    expect(result.ok).toBe(true);
  });
});

describe("garden save migration", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    installStorage();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("clears legacy v1 saves and starts fresh on v2 key", () => {
    const legacy = emptyGardenSnapshot(1000);
    legacy.plots[5] = {
      ...legacy.plots[5]!,
      seedId: "old-seed",
      seedTier: "common",
      plantedAt: 500,
    };
    localStorage.setItem("wke-garden-v1", JSON.stringify(legacy));

    const loaded = getGardenSnapshot();
    expect(localStorage.getItem("wke-garden-v1")).toBeNull();
    expect(loaded.plots.every((p) => p.seedId == null)).toBe(true);
    expect(loaded.purchasedPlotKeys).toEqual([]);
  });

  it("leaves purchasedPlotKeys empty when field is missing on v2 save", () => {
    const legacy = emptyGardenSnapshot(1000);
    delete legacy.purchasedPlotKeys;
    localStorage.setItem(GARDEN_STORAGE_KEY, JSON.stringify(legacy));

    const loaded = getGardenSnapshot();
    expect(loaded.purchasedPlotKeys).toEqual([]);
    expect(plantSeedAt(loaded, 2, 2, 1000)).toEqual({ ok: false, reason: "plot_locked" });
  });
});
