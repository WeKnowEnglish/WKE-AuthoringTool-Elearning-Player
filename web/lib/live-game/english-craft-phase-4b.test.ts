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
  resourcePool: { wood: 10, stone: 5, wheat: 0, cotton: 0 },
  craftedItems: { benchBuilt: false, hammers: 0, boat: false },
};

describe("english-craft phase 4b build_bench recipe", () => {
  it("locks build_bench costs to 10 wood and 5 stone", () => {
    expect(ENGLISH_CRAFT_BUILD_BENCH_COSTS).toEqual({ wood: 10, stone: 5 });
    expect(getCraftRecipe("build_bench").poolCost).toEqual({ wood: 10, stone: 5 });
    expect(formatRecipeCostSummary(ENGLISH_CRAFT_BUILD_BENCH_RECIPE)).toBe("10 wood · 5 stone");
  });

  it("affords build_bench at 10 wood and 5 stone", () => {
    const pool = { wood: 10, stone: 5, wheat: 0, cotton: 0 };
    expect(canAffordRecipePoolCost(pool, ENGLISH_CRAFT_BUILD_BENCH_RECIPE)).toBe(true);
    expect(canAffordRecipePoolCost({ ...pool, wood: 9 }, ENGLISH_CRAFT_BUILD_BENCH_RECIPE)).toBe(false);
    expect(canAffordRecipePoolCost({ ...pool, stone: 4 }, ENGLISH_CRAFT_BUILD_BENCH_RECIPE)).toBe(false);
  });

  it("lists missing pool resources for build_bench", () => {
    expect(
      missingRecipePoolResources(
        { wood: 9, stone: 4, wheat: 0, cotton: 0 },
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
          resourcePool: { wood: 9, stone: 5, wheat: 0, cotton: 0 },
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
          resourcePool: { wood: 9, stone: 5, wheat: 0, cotton: 0 },
        },
        "build_bench",
      ),
    ).toBeNull();
  });
});
