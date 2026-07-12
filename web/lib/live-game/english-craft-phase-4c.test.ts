import { describe, expect, it } from "vitest";
import {
  applyCraftRecipeAwardToSnapshot,
} from "@/lib/live-game/server/award-craft-recipe";
import {
  canAffordRecipeCraftedCost,
  canAffordRecipePoolCost,
  canCraftAtBench,
  canStartRecipeCraft,
  ENGLISH_CRAFT_CRAFT_BOAT_RECIPE,
  ENGLISH_CRAFT_CRAFT_HAMMER_RECIPE,
  formatRecipeFullCostSummary,
  getDefaultBenchRecipe,
  listBenchCraftRecipes,
  missingRecipeCraftedResources,
  missingRecipeRequirements,
} from "@/lib/live-game/modes/english-craft/craft-recipes-v1";
import { isBoatBoardingUnlocked } from "@/lib/live-game/server/read-storage";
import { readCraftedItems } from "@/lib/live-game/server/read-crafted-items";

const playingSession = {
  session: { phase: "playing" as const },
  resourcePool: { wood: 20, stone: 10, wheat: 0, cotton: 10 },
  craftedItems: { benchBuilt: true, hammers: 5, boat: false, bridge: false },
  unlockedObjects: { river_crossing: false, boat_boarding: false },
};

describe("english-craft phase 4c hammer recipe", () => {
  it("locks hammer costs to 2 wood and 2 stone", () => {
    expect(ENGLISH_CRAFT_CRAFT_HAMMER_RECIPE.poolCost).toEqual({ wood: 2, stone: 2 });
  });

  it("affords hammer craft at 2 wood and 2 stone", () => {
    const pool = { wood: 2, stone: 2, wheat: 0, cotton: 0 };
    expect(canAffordRecipePoolCost(pool, ENGLISH_CRAFT_CRAFT_HAMMER_RECIPE)).toBe(true);
    expect(canAffordRecipePoolCost({ ...pool, wood: 1 }, ENGLISH_CRAFT_CRAFT_HAMMER_RECIPE)).toBe(false);
  });

  it("requires an active bench and no boat for hammer craft", () => {
    expect(
      canStartRecipeCraft(
        {
          session: { phase: "playing" },
          resourcePool: { wood: 2, stone: 2, wheat: 0, cotton: 0 },
          craftedItems: { benchBuilt: false, hammers: 0, boat: false, bridge: false },
        },
        "craft_hammer",
      ),
    ).toBe(false);

    expect(
      canStartRecipeCraft(
        {
          ...playingSession,
          resourcePool: { wood: 2, stone: 2, wheat: 0, cotton: 0 },
          craftedItems: { benchBuilt: true, hammers: 0, boat: true, bridge: false },
        },
        "craft_hammer",
      ),
    ).toBe(false);
  });

  it("increments team hammers on hammer award", () => {
    const next = applyCraftRecipeAwardToSnapshot(
      {
        ...playingSession,
        resourcePool: { wood: 4, stone: 4, wheat: 0, cotton: 0 },
        craftedItems: { benchBuilt: true, hammers: 2, boat: false, bridge: false },
      },
      "craft_hammer",
    );
    expect(next?.resourcePool).toEqual({ wood: 2, stone: 2, wheat: 0, cotton: 0 });
    expect(readCraftedItems(next).hammers).toBe(3);
  });
});

describe("english-craft phase 4c boat recipe", () => {
  it("locks boat costs to 5 hammers, 20 wood, and 10 cotton", () => {
    expect(ENGLISH_CRAFT_CRAFT_BOAT_RECIPE.poolCost).toEqual({ wood: 20, cotton: 10 });
    expect(ENGLISH_CRAFT_CRAFT_BOAT_RECIPE.craftedCost).toEqual({ hammers: 5 });
    expect(formatRecipeFullCostSummary(ENGLISH_CRAFT_CRAFT_BOAT_RECIPE)).toBe(
      "5 hammers · 20 wood · 10 cotton",
    );
  });

  it("blocks boat craft below 5 hammers", () => {
    expect(
      canAffordRecipeCraftedCost(
        { benchBuilt: true, hammers: 4, boat: false, bridge: false },
        ENGLISH_CRAFT_CRAFT_BOAT_RECIPE,
      ),
    ).toBe(false);
    expect(
      missingRecipeCraftedResources(
        { benchBuilt: true, hammers: 4, boat: false, bridge: false },
        ENGLISH_CRAFT_CRAFT_BOAT_RECIPE,
      ),
    ).toEqual(["hammers"]);
  });

  it("gates boat craft on hammers and pool resources", () => {
    expect(canStartRecipeCraft(playingSession, "craft_boat")).toBe(true);
    expect(
      canStartRecipeCraft(
        {
          ...playingSession,
          craftedItems: { benchBuilt: true, hammers: 4, boat: false, bridge: false },
        },
        "craft_boat",
      ),
    ).toBe(false);
    expect(
      canStartRecipeCraft(
        {
          ...playingSession,
          resourcePool: { wood: 19, stone: 0, wheat: 0, cotton: 10 },
        },
        "craft_boat",
      ),
    ).toBe(false);
  });

  it("deducts pool and hammers and unlocks boat boarding on boat award", () => {
    const next = applyCraftRecipeAwardToSnapshot(playingSession, "craft_boat");
    expect(next?.resourcePool).toEqual({ wood: 0, stone: 10, wheat: 0, cotton: 0 });
    expect(readCraftedItems(next)).toEqual({
      benchBuilt: true,
      hammers: 0,
      boat: true,
      bridge: false,
    });
    expect(isBoatBoardingUnlocked(next)).toBe(true);
  });

  it("blocks further hammer crafts after boat is built", () => {
    const afterBoat = applyCraftRecipeAwardToSnapshot(playingSession, "craft_boat");
    expect(
      canStartRecipeCraft(
        {
          ...afterBoat,
          resourcePool: { wood: 10, stone: 10, wheat: 0, cotton: 0 },
        },
        "craft_hammer",
      ),
    ).toBe(false);
  });
});

describe("english-craft phase 4c bench recipe menu", () => {
  it("lists hammer and boat recipes when bench is active", () => {
    expect(canCraftAtBench(playingSession)).toBe(true);
    expect(listBenchCraftRecipes(playingSession).map((recipe) => recipe.id)).toEqual([
      "craft_hammer",
      "craft_boat",
    ]);
    expect(listBenchCraftRecipes({ ...playingSession, craftedItems: { boat: true } })).toEqual([]);
  });

  it("prefers hammer for default prefetch when both are affordable", () => {
    expect(getDefaultBenchRecipe(playingSession)).toBe("craft_hammer");
    expect(
      getDefaultBenchRecipe({
        ...playingSession,
        resourcePool: { wood: 20, stone: 0, wheat: 0, cotton: 10 },
        craftedItems: { benchBuilt: true, hammers: 5, boat: false, bridge: false },
      }),
    ).toBe("craft_boat");
  });

  it("does not block hammer craft when only legacy bridge is crafted", () => {
    expect(
      canStartRecipeCraft(
        {
          session: { phase: "playing" },
          resourcePool: { wood: 2, stone: 2, wheat: 0, cotton: 0 },
          craftedItems: { benchBuilt: true, hammers: 0, boat: false, bridge: true },
        },
        "craft_hammer",
      ),
    ).toBe(true);
  });

  it("reports combined missing requirements for boat craft", () => {
    expect(
      missingRecipeRequirements(
        { wood: 20, stone: 0, wheat: 0, cotton: 9 },
        { benchBuilt: true, hammers: 4, boat: false, bridge: false },
        ENGLISH_CRAFT_CRAFT_BOAT_RECIPE,
      ),
    ).toEqual(["cotton", "hammers"]);
  });
});
