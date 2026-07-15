import { describe, expect, it } from "vitest";
import {
  reconcilePlayerHunger,
  isPlayerStarving,
  isPlayerHungerLow,
} from "@/lib/live-game/modes/english-craft/hunger";
import {
  ENGLISH_CRAFT_HUNGER_DECAY_AMOUNT,
  ENGLISH_CRAFT_HUNGER_DECAY_INTERVAL_MS,
  ENGLISH_CRAFT_HUNGER_MAX,
} from "@/lib/live-game/modes/english-craft/gameplay-v1";
import {
  applyCraftRecipeAwardToSnapshot,
} from "@/lib/live-game/server/award-craft-recipe";
import { applyConsumeBreadToSnapshot } from "@/lib/live-game/server/award-consume";
import {
  canStartRecipeCraft,
  ENGLISH_CRAFT_CRAFT_BREAD_RECIPE,
  getDefaultBenchRecipe,
  listBenchCraftRecipes,
} from "@/lib/live-game/modes/english-craft/craft-recipes-v1";

const playingSession = {
  session: { phase: "playing" as const },
  resourcePool: { wood: 10, stone: 10, wheat: 4, cotton: 0 },
  craftedItems: { benchBuilt: true, hammers: 0, boat: false },
};

describe("english-craft phase 4d hunger decay", () => {
  it("does not decay hunger while the session is not playing", () => {
    const hunger = { value: 80, lastUpdatedAt: 1_000 };
    expect(
      reconcilePlayerHunger(hunger, 1_000 + ENGLISH_CRAFT_HUNGER_DECAY_INTERVAL_MS * 3, false),
    ).toEqual(hunger);
  });

  it("decays hunger every 45 seconds while playing", () => {
    const start = 1_000_000;
    const hunger = { value: ENGLISH_CRAFT_HUNGER_MAX, lastUpdatedAt: start };
    const afterOneTick = reconcilePlayerHunger(
      hunger,
      start + ENGLISH_CRAFT_HUNGER_DECAY_INTERVAL_MS,
      true,
    );
    expect(afterOneTick.value).toBe(ENGLISH_CRAFT_HUNGER_MAX - ENGLISH_CRAFT_HUNGER_DECAY_AMOUNT);

    const afterTwoTicks = reconcilePlayerHunger(
      afterOneTick,
      start + ENGLISH_CRAFT_HUNGER_DECAY_INTERVAL_MS * 2,
      true,
    );
    expect(afterTwoTicks.value).toBe(ENGLISH_CRAFT_HUNGER_MAX - ENGLISH_CRAFT_HUNGER_DECAY_AMOUNT * 2);
  });

  it("never drops hunger below zero", () => {
    const start = 1_000_000;
    const hunger = { value: 1, lastUpdatedAt: start };
    const reconciled = reconcilePlayerHunger(
      hunger,
      start + ENGLISH_CRAFT_HUNGER_DECAY_INTERVAL_MS * 5,
      true,
    );
    expect(reconciled.value).toBe(0);
    expect(isPlayerStarving(reconciled, start + ENGLISH_CRAFT_HUNGER_DECAY_INTERVAL_MS * 5, true)).toBe(
      true,
    );
  });

  it("flags low hunger above zero", () => {
    const hunger = { value: 25, lastUpdatedAt: Date.now() };
    expect(isPlayerHungerLow(hunger, Date.now(), true)).toBe(true);
    expect(isPlayerStarving(hunger, Date.now(), true)).toBe(false);
  });
});

describe("english-craft phase 4d bread craft", () => {
  it("locks bread cost to 2 wheat", () => {
    expect(ENGLISH_CRAFT_CRAFT_BREAD_RECIPE.poolCost).toEqual({ wheat: 2 });
    expect(ENGLISH_CRAFT_CRAFT_BREAD_RECIPE.grants).toEqual({ breadToCrafter: 1 });
  });

  it("requires an active bench, free carry slot, and no boat", () => {
    expect(canStartRecipeCraft(playingSession, "craft_bread", "player-1")).toBe(true);
    expect(
      canStartRecipeCraft(
        {
          ...playingSession,
          resourcePool: { wood: 0, stone: 0, wheat: 1, cotton: 0 },
        },
        "craft_bread",
        "player-1",
      ),
    ).toBe(false);
    expect(
      canStartRecipeCraft(
        {
          ...playingSession,
          craftedItems: { benchBuilt: true, hammers: 0, boat: true },
        },
        "craft_bread",
        "player-1",
      ),
    ).toBe(false);
  });

  it("adds bread to the crafter carry bag instead of an inventory count", () => {
    const next = applyCraftRecipeAwardToSnapshot(playingSession, "craft_bread", "player-1");
    expect(next?.resourcePool.wheat).toBe(2);
    expect(next?.playerCarry?.["player-1"]?.slots.some((slot) => slot?.kind === "bread")).toBe(true);
  });

  it("lists backpack and bread in the bench recipe menu", () => {
    const recipes = listBenchCraftRecipes(playingSession);
    expect(recipes.map((recipe) => recipe.id)).toEqual([
      "craft_backpack",
      "craft_hammer",
      "craft_bread",
      "craft_boat",
    ]);
    expect(getDefaultBenchRecipe(playingSession)).toBe("craft_hammer");
  });
});

describe("english-craft phase 4d consume bread", () => {
  it("restores hunger and decrements inventory bread", () => {
    const result = applyConsumeBreadToSnapshot(
      {
        session: { phase: "playing" },
        playerInventory: { "player-1": { bread: 2, backpack: false } },
        playerHunger: { "player-1": { value: 10, lastUpdatedAt: 1_000 } },
      },
      "player-1",
      50_000,
    );
    expect(result?.playerInventory["player-1"]?.bread).toBe(1);
    expect(result?.playerHunger["player-1"]?.value).toBe(ENGLISH_CRAFT_HUNGER_MAX);
    expect(result?.playerHunger["player-1"]?.lastUpdatedAt).toBe(50_000);
  });

  it("consumes held carry bread first", () => {
    const result = applyConsumeBreadToSnapshot(
      {
        session: { phase: "playing" },
        playerInventory: { "player-1": { bread: 0, backpack: false } },
        playerCarry: {
          "player-1": {
            slots: [{ kind: "bread", craftedAt: 1 }, null, null, null],
            heldSlotIndex: 0,
          },
        },
        playerHunger: { "player-1": { value: 10, lastUpdatedAt: 1_000 } },
      },
      "player-1",
      50_000,
    );
    expect(result?.playerCarry?.["player-1"]).toBeUndefined();
    expect(result?.playerHunger["player-1"]?.value).toBe(ENGLISH_CRAFT_HUNGER_MAX);
  });

  it("rejects consume when bread is empty", () => {
    const result = applyConsumeBreadToSnapshot(
      {
        session: { phase: "playing" },
        playerInventory: { "player-1": { bread: 0, backpack: false } },
      },
      "player-1",
    );
    expect(result).toBeNull();
  });
});
