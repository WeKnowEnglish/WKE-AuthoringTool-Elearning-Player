import { describe, expect, it, vi } from "vitest";
import { plantSeedAt } from "@/lib/garden/actions";
import { emptyGardenSnapshot } from "@/lib/garden/defaults";
import {
  gardenPlotOverlayText,
  gardenPlotOverlayVariant,
  gardenGridNaturalSize,
  resolveGardenCellVisual,
} from "@/lib/garden/garden-map-layout";
import { allGrassPlotKeys } from "@/lib/garden/plot-unlock";

describe("resolveGardenCellVisual", () => {
  it("returns unlocked dirt plot for row 0", () => {
    const snap = emptyGardenSnapshot();
    const cell = resolveGardenCellVisual(snap, 0, 0, 1000);
    expect(cell?.kind).toBe("plot");
    expect(cell?.tileId).toBe("dirt_tilled");
  });

  it("returns locked grass with purchase cost for unpurchased cells", () => {
    const snap = emptyGardenSnapshot();
    const cell = resolveGardenCellVisual(snap, 2, 1, 1000, { gold: 100 });
    expect(cell).toEqual({
      kind: "locked_grass",
      row: 2,
      col: 1,
      tileId: "grass_1",
      purchaseCost: 25,
      canAfford: true,
    });
  });

  it("marks locked grass unaffordable when gold is too low", () => {
    const snap = emptyGardenSnapshot();
    const cell = resolveGardenCellVisual(snap, 1, 0, 1000, { gold: 10 });
    expect(cell?.canAfford).toBe(false);
  });

  it("increases purchase cost after one grass plot is bought", () => {
    const snap = { ...emptyGardenSnapshot(), purchasedPlotKeys: ["1,0"] };
    const cell = resolveGardenCellVisual(snap, 2, 2, 1000);
    expect(cell?.kind).toBe("locked_grass");
    expect(cell?.purchaseCost).toBe(50);
  });

  it("returns plot visual for purchased grass cells", () => {
    const snap = { ...emptyGardenSnapshot(), purchasedPlotKeys: ["2,1"] };
    const cell = resolveGardenCellVisual(snap, 2, 1, 1000);
    expect(cell?.kind).toBe("plot");
    expect(cell?.tileId).toBe("dirt_tilled");
  });

  it("exposes letter fruit fields on planted crops", () => {
    const now = 100_000;
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
      clear: () => store.clear(),
    });
    vi.stubGlobal("window", Object.assign(globalThis, { localStorage }));

    const planted = plantSeedAt(emptyGardenSnapshot(now), 0, 0, now);
    expect(planted.ok).toBe(true);
    if (!planted.ok) return;

    const plot = planted.snapshot.plots[0]!;
    const cell = resolveGardenCellVisual(planted.snapshot, 0, 0, now + 1_000);
    expect(cell?.kind).toBe("plot");
    if (cell?.kind !== "plot") return;

    expect(cell.plotVisual.fruitSlug).toBe(plot.fruitSlug);
    expect(cell.plotVisual.fruitStage).toBe("seed");
    expect(cell.plotVisual.fruitSlug).not.toBeNull();
  });

  it("returns null when all grass plots are purchased and cell is invalid", () => {
    const snap = { ...emptyGardenSnapshot(), purchasedPlotKeys: allGrassPlotKeys() };
    expect(resolveGardenCellVisual(snap, 9, 9, 1000)).toBeNull();
  });
});

describe("gardenGridNaturalSize", () => {
  it("includes padding, label row, and lip overlap", () => {
    const snap = emptyGardenSnapshot();
    const size = gardenGridNaturalSize(snap.gridRows, snap.gridCols);
    expect(size.width).toBe(8 + snap.gridCols * 63);
    expect(size.height).toBe(15 + 4 + snap.gridRows * 59 + 59 + 22);
  });
});

describe("gardenPlotOverlayText", () => {
  it("returns null for empty plots", () => {
    const snap = emptyGardenSnapshot();
    const plot = snap.plots[0]!;
    expect(gardenPlotOverlayText(plot, 1000)).toBeNull();
  });

  it("returns timer text while growing", () => {
    const snap = emptyGardenSnapshot();
    const plot = {
      ...snap.plots[0]!,
      seedId: "s1",
      seedTier: "common" as const,
      plantedAt: 1000,
    };
    expect(gardenPlotOverlayText(plot, 16_000)).toBe("45s");
  });

  it("returns weed label on empty plots with monsters", () => {
    const snap = emptyGardenSnapshot();
    const puzzle = {
      puzzleId: "weed:0,0:1",
      words: ["CAT", "DOG", "HEN"] as [string, string, string],
      letterTray: ["C", "A", "T", "D", "O", "G", "H", "E", "N"],
    };
    const weedy = { ...snap.plots[0]!, weedMonster: puzzle };
    expect(gardenPlotOverlayText(weedy, 1000)).toBe("Fight!");
    expect(gardenPlotOverlayVariant(weedy, 1000)).toBe("weed");
  });

  it("returns ready label for harvestable crops", () => {
    const snap = emptyGardenSnapshot();
    const ready = {
      ...snap.plots[0]!,
      seedId: "s1",
      seedTier: "common" as const,
      plantedAt: 0,
    };
    expect(gardenPlotOverlayText(ready, 120_000)).toBe("Tap!");
    expect(gardenPlotOverlayVariant(ready, 120_000)).toBe("ready");
  });
});
