import { describe, expect, it } from "vitest";
import { GROW_MS_BY_TIER } from "@/lib/garden/growth";
import type { FarmPlot } from "@/lib/garden/types";
import {
  mockPlotStateToIndividualTileId,
  plotToIndividualTileId,
  resolvePlotVisual,
} from "@/lib/topdown/plot-to-individual-tile";

function plot(overrides: Partial<FarmPlot> = {}): FarmPlot {
  return {
    row: 0,
    col: 0,
    seedId: null,
    seedTier: null,
    plantedAt: null,
    growMultiplier: 1,
    ...overrides,
  };
}

describe("plotToIndividualTileId", () => {
  it("maps empty plot to tilled", () => {
    expect(plotToIndividualTileId({ plot: plot(), now: 0 })).toBe("dirt_tilled");
  });

  it("maps planted and growing plots to tilled base tile", () => {
    const plantedAt = 10_000;
    expect(
      plotToIndividualTileId({
        plot: plot({ seedId: "s1", seedTier: "common", plantedAt }),
        now: plantedAt,
      }),
    ).toBe("dirt_tilled");

    const duration = GROW_MS_BY_TIER.common;
    expect(
      plotToIndividualTileId({
        plot: plot({ seedId: "s1", seedTier: "common", plantedAt: 0 }),
        now: duration * 0.3,
      }),
    ).toBe("dirt_tilled");

    expect(
      plotToIndividualTileId({
        plot: plot({ seedId: "s1", seedTier: "common", plantedAt: 0 }),
        now: duration * 0.9,
      }),
    ).toBe("dirt_tilled");

    expect(
      plotToIndividualTileId({
        plot: plot({ seedId: "s1", seedTier: "common", plantedAt: 0 }),
        now: duration + 1,
      }),
    ).toBe("dirt_tilled");
  });
});

describe("mockPlotStateToIndividualTileId", () => {
  it("maps all mock plot states to tilled soil", () => {
    expect(mockPlotStateToIndividualTileId("sprout")).toBe("dirt_tilled");
    expect(mockPlotStateToIndividualTileId("ready")).toBe("dirt_tilled");
    expect(mockPlotStateToIndividualTileId("empty")).toBe("dirt_tilled");
  });
});

describe("resolvePlotVisual", () => {
  it("reports weed overlay on empty plots with monsters", () => {
    const puzzle = {
      puzzleId: "weed:0,0:1",
      words: ["CAT", "DOG", "HEN"] as [string, string, string],
      letterTray: ["C", "A", "T", "D", "O", "G", "H", "E", "N"],
    };
    const visual = resolvePlotVisual({
      plot: plot({ weedMonster: puzzle }),
      now: 0,
    });
    expect(visual.tileId).toBe("dirt_tilled");
    expect(visual.overlays.hasWeed).toBe(true);
    expect(visual.fruitStage).toBeNull();
    expect(visual.fruitSlug).toBeNull();
  });

  it("reports fertilized overlay on tilled harvest tile", () => {
    const plantedAt = 0;
    const now = plantedAt + GROW_MS_BY_TIER.common + 1;
    const visual = resolvePlotVisual({
      plot: plot({
        seedId: "s1",
        seedTier: "common",
        plantedAt,
        fertilizedAt: now,
      }),
      now,
    });
    expect(visual.tileId).toBe("dirt_tilled");
    expect(visual.overlays.isFertilized).toBe(true);
    expect(visual.overlays.hasWeed).toBe(false);
    expect(visual.fruitStage).toBe("ripe");
    expect(visual.fruitSlug).toBeNull();
  });

  it("returns null fruit fields for empty plots", () => {
    const visual = resolvePlotVisual({ plot: plot(), now: 0 });
    expect(visual.fruitStage).toBeNull();
    expect(visual.fruitSlug).toBeNull();
  });

  it("maps planted crop growth to letter fruit stages", () => {
    const plantedAt = 0;
    const duration = GROW_MS_BY_TIER.common;
    const base = {
      seedId: "s1",
      seedTier: "common" as const,
      plantedAt,
      fruitSlug: "e" as const,
    };

    expect(
      resolvePlotVisual({ plot: plot(base), now: plantedAt + duration * 0.05 }).fruitStage,
    ).toBe("seed");
    expect(
      resolvePlotVisual({ plot: plot(base), now: plantedAt + duration * 0.2 }).fruitStage,
    ).toBe("sprout");
    expect(
      resolvePlotVisual({ plot: plot(base), now: plantedAt + duration * 0.5 }).fruitStage,
    ).toBe("young");
    expect(
      resolvePlotVisual({ plot: plot(base), now: plantedAt + duration * 0.9 }).fruitStage,
    ).toBe("growing");
    expect(
      resolvePlotVisual({ plot: plot(base), now: plantedAt + duration + 1 }).fruitStage,
    ).toBe("ripe");
  });

  it("preserves fruitSlug on planted plots and clears it when empty", () => {
    const plantedAt = 10_000;
    const planted = resolvePlotVisual({
      plot: plot({
        seedId: "s1",
        seedTier: "common",
        plantedAt,
        fruitSlug: "j_green",
        cropLetter: "J",
      }),
      now: plantedAt + 1000,
    });
    expect(planted.fruitSlug).toBe("j_green");
    expect(planted.fruitStage).toBe("seed");

    const empty = resolvePlotVisual({ plot: plot(), now: 0 });
    expect(empty.fruitSlug).toBeNull();
    expect(empty.fruitStage).toBeNull();
  });

  it("preserves watered and fertilized overlay flags without fruit art changes", () => {
    const plantedAt = 0;
    const now = plantedAt + GROW_MS_BY_TIER.common * 0.4;
    const visual = resolvePlotVisual({
      plot: plot({
        seedId: "s1",
        seedTier: "common",
        plantedAt,
        fruitSlug: "a",
        growMultiplier: 2,
        fertilizedAt: now,
      }),
      now,
    });
    expect(visual.overlays.isWatered).toBe(true);
    expect(visual.overlays.isFertilized).toBe(true);
    expect(visual.fruitStage).toBe("young");
    expect(visual.fruitSlug).toBe("a");
  });
});
