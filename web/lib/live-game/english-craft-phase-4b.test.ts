import { describe, expect, it } from "vitest";
import {
  applyCraftRecipeAwardToSnapshot,
} from "@/lib/live-game/server/award-craft-recipe";
import {
  canAffordRecipePoolCost,
  canStartRecipeCraft,
  ENGLISH_CRAFT_BUILD_BENCH_COSTS,
  ENGLISH_CRAFT_BUILD_BENCH_RECIPE,
  formatMissingRecipeResources,
  formatRecipeCostSummary,
  getCraftRecipe,
  listAvailableCraftRecipes,
  missingRecipePoolResources,
} from "@/lib/live-game/modes/english-craft/craft-recipes-v1";
import { canBuildBench } from "@/lib/live-game/server/read-storage";
import { readCraftedItems } from "@/lib/live-game/server/read-crafted-items";

const playingSession = {
  session: { phase: "playing" as const },
  resourcePool: { wood: 2, stone: 1, wheat: 0, cotton: 0 },
  craftedItems: { benchBuilt: false, hammers: 0, boat: false },
};

describe("english-craft phase 4b build_bench recipe", () => {
  it("locks build_bench costs to 2 wood and 1 stone", () => {
    expect(ENGLISH_CRAFT_BUILD_BENCH_COSTS).toEqual({ wood: 2, stone: 1 });
    expect(getCraftRecipe("build_bench").poolCost).toEqual({ wood: 2, stone: 1 });
    expect(formatRecipeCostSummary(ENGLISH_CRAFT_BUILD_BENCH_RECIPE)).toBe("2 wood · 1 stone");
  });

  it("affords build_bench at 2 wood and 1 stone", () => {
    const pool = { wood: 2, stone: 1, wheat: 0, cotton: 0 };
    expect(canAffordRecipePoolCost(pool, ENGLISH_CRAFT_BUILD_BENCH_RECIPE)).toBe(true);
    expect(canAffordRecipePoolCost({ ...pool, wood: 1 }, ENGLISH_CRAFT_BUILD_BENCH_RECIPE)).toBe(false);
    expect(canAffordRecipePoolCost({ ...pool, stone: 0 }, ENGLISH_CRAFT_BUILD_BENCH_RECIPE)).toBe(false);
  });

  it("lists missing pool resources for build_bench", () => {
    expect(
      missingRecipePoolResources(
        { wood: 1, stone: 0, wheat: 0, cotton: 0 },
        ENGLISH_CRAFT_BUILD_BENCH_RECIPE,
      ),
    ).toEqual(["wood", "stone"]);
    expect(
      formatMissingRecipeResources(["wood"], ENGLISH_CRAFT_BUILD_BENCH_RECIPE),
    ).toBe("Need more wood to build workbench.");
  });

  it("gates build_bench on phase, bench state, and affordability", () => {
    expect(canStartRecipeCraft(playingSession, "build_bench")).toBe(true);
    expect(canBuildBench(playingSession)).toBe(true);

    expect(
      canStartRecipeCraft(
        {
          ...playingSession,
          resourcePool: { wood: 1, stone: 1, wheat: 0, cotton: 0 },
        },
        "build_bench",
      ),
    ).toBe(false);

    expect(
      canStartRecipeCraft(
        {
          ...playingSession,
          craftedItems: { benchBuilt: true, hammers: 0, boat: false },
        },
        "build_bench",
      ),
    ).toBe(false);

    expect(
      listAvailableCraftRecipes({
        ...playingSession,
        craftedItems: { benchBuilt: true, hammers: 0, boat: false },
      }).map((recipe) => recipe.id),
    ).not.toContain("build_bench");
  });

  it("deducts pool resources and grants benchBuilt on award", () => {
    const next = applyCraftRecipeAwardToSnapshot(playingSession, "build_bench");
    expect(next?.resourcePool).toEqual({ wood: 0, stone: 0, wheat: 0, cotton: 0 });
    expect(readCraftedItems(next)).toEqual({
      benchBuilt: true,
      hammers: 0,
      boat: false,
    });
  });

  it("returns null when bench is already built or resources are short", () => {
    expect(
      applyCraftRecipeAwardToSnapshot(
        {
          ...playingSession,
          craftedItems: { benchBuilt: true, hammers: 0, boat: false },
        },
        "build_bench",
      ),
    ).toBeNull();

    expect(
      applyCraftRecipeAwardToSnapshot(
        {
          ...playingSession,
          resourcePool: { wood: 1, stone: 1, wheat: 0, cotton: 0 },
        },
        "build_bench",
      ),
    ).toBeNull();
  });
});
