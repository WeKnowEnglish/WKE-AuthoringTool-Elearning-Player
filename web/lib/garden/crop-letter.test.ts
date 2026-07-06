import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { harvestAt, plantSeedAt } from "@/lib/garden/actions";
import {
  assignCropIdentity,
  deterministicRng,
  ensurePlotCropIdentity,
  fruitSlugForCropLetter,
  normalizeCropLetter,
  normalizeFruitSlug,
  plotCropIdentitySeed,
  rollCropLetter,
} from "@/lib/garden/crop-letter";
import { emptyGardenSnapshot } from "@/lib/garden/defaults";
import { GROW_MS_BY_TIER } from "@/lib/garden/growth";
import { pickWeightedLetter, buildHarvestWeights } from "@/lib/garden/harvest-weights";
import { getGardenSnapshot, setGardenSnapshot } from "@/lib/garden/storage";
import type { FarmPlot } from "@/lib/garden/types";

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

function plantedPlot(overrides: Partial<FarmPlot> = {}): FarmPlot {
  return {
    row: 0,
    col: 0,
    seedId: "seed-1",
    seedTier: "common",
    plantedAt: 100_000,
    growMultiplier: 1,
    ...overrides,
  };
}

describe("crop letter helpers", () => {
  it("normalizes crop letters and fruit slugs", () => {
    expect(normalizeCropLetter("e")).toBe("E");
    expect(normalizeCropLetter("cat")).toBeNull();
    expect(normalizeFruitSlug("j_green")).toBe("j_green");
    expect(normalizeFruitSlug("j_blue")).toBeNull();
  });

  it("maps letters to fruit slugs with a 50/50 J split", () => {
    expect(fruitSlugForCropLetter("A")).toBe("a");
    expect(fruitSlugForCropLetter("J", () => 0)).toBe("j_green");
    expect(fruitSlugForCropLetter("J", () => 0.99)).toBe("j_red");
  });

  it("assigns crop identity from harvest weights", () => {
    const snap = emptyGardenSnapshot();
    vi.spyOn(Math, "random").mockReturnValue(0);
    const identity = assignCropIdentity(snap);
    expect(identity.cropLetter).toMatch(/^[A-Z]$/);
    expect(identity.fruitSlug).toBeTruthy();
  });

  it("uses deterministic backfill for legacy planted plots", () => {
    const snap = emptyGardenSnapshot();
    const plot = plantedPlot({ row: 1, col: 2, seedId: "legacy-seed" });
    const first = ensurePlotCropIdentity(plot, snap);
    const second = ensurePlotCropIdentity(plot, snap);
    expect(first.cropLetter).toMatch(/^[A-Z]$/);
    expect(first.fruitSlug).toBeTruthy();
    expect(second).toEqual(first);
  });

  it("derives a stable seed from plot coordinates and plant time", () => {
    const plot = plantedPlot({ row: 2, col: 3, plantedAt: 42, seedId: "abc" });
    expect(plotCropIdentitySeed(plot)).toBe("2,3,42,abc");
    const a = rollCropLetter(emptyGardenSnapshot(), deterministicRng(plotCropIdentitySeed(plot)));
    const b = rollCropLetter(emptyGardenSnapshot(), deterministicRng(plotCropIdentitySeed(plot)));
    expect(a).toBe(b);
  });
});

describe("crop letter actions", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    installLocalStorage();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("stores cropLetter and fruitSlug when planting", () => {
    const now = 100_000;
    const snap = emptyGardenSnapshot(now);
    vi.spyOn(Math, "random").mockReturnValue(0);

    const planted = plantSeedAt(snap, 0, 0, now);
    expect(planted.ok).toBe(true);
    if (!planted.ok) return;

    const plot = planted.snapshot.plots[0]!;
    expect(plot.cropLetter).toMatch(/^[A-Z]$/);
    expect(plot.fruitSlug).toBeTruthy();
  });

  it("harvests the planted crop letter instead of re-rolling", () => {
    const now = 100_000;
    const snap = emptyGardenSnapshot(now);
    const planted = plantSeedAt(snap, 0, 0, now);
    expect(planted.ok).toBe(true);
    if (!planted.ok) return;

    const cropLetter = planted.snapshot.plots[0]?.cropLetter;
    expect(cropLetter).toBeTruthy();

    const readyAt = now + GROW_MS_BY_TIER.common;
    const harvested = harvestAt(planted.snapshot, 0, 0, readyAt);
    expect(harvested.ok).toBe(true);
    if (!harvested.ok) return;

    expect(harvested.letter).toBe(cropLetter);
    expect(harvested.snapshot.plots[0]?.cropLetter).toBeNull();
    expect(harvested.snapshot.plots[0]?.fruitSlug).toBeNull();
    expect(harvested.snapshot.letters[cropLetter!]).toBe(1);
  });

  it("backfills crop identity when loading legacy planted plots", () => {
    const now = 100_000;
    const snap = {
      ...emptyGardenSnapshot(now),
      plots: emptyGardenSnapshot(now).plots.map((plot, index) =>
        index === 0 ?
          {
            ...plot,
            seedId: "legacy-seed",
            seedTier: "common" as const,
            plantedAt: now,
            growMultiplier: 1,
          }
        : plot,
      ),
    };
    setGardenSnapshot(snap);

    const loaded = getGardenSnapshot();
    const plot = loaded.plots[0]!;
    expect(plot.cropLetter).toMatch(/^[A-Z]$/);
    expect(plot.fruitSlug).toBeTruthy();

    const reloaded = getGardenSnapshot();
    expect(reloaded.plots[0]?.cropLetter).toBe(plot.cropLetter);
    expect(reloaded.plots[0]?.fruitSlug).toBe(plot.fruitSlug);
  });

  it("matches rollCropLetter to the legacy harvest roll for the same rng", () => {
    const snap = emptyGardenSnapshot();
    const rolled = rollCropLetter(snap, () => 0);
    const legacy = pickWeightedLetter(buildHarvestWeights(snap), () => 0);
    expect(rolled).toBe(legacy);
  });
});
