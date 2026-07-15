import { describe, expect, it } from "vitest";
import {
  buildVictoryResourceStats,
  sumHarvestedByType,
} from "@/lib/live-game/hooks/useLiveGameVictoryStats";
import { ENGLISH_CRAFT_RESOURCE_GOALS } from "@/lib/live-game/modes/english-craft/gameplay-v1";
import {
  canAffordRecipePoolCost,
  ENGLISH_CRAFT_BUILD_BENCH_COSTS,
  ENGLISH_CRAFT_BUILD_BENCH_RECIPE,
  formatMissingRecipeResources,
  missingRecipePoolResources,
} from "@/lib/live-game/modes/english-craft/craft-recipes-v1";
import { canStartCraftChallenge } from "@/lib/live-game/server/read-storage";

describe("english-craft phase 3f craft costs", () => {
  it("uses build_bench costs for the first craft milestone", () => {
    expect(ENGLISH_CRAFT_BUILD_BENCH_COSTS).toEqual({
      wood: 2,
      stone: 1,
    });
  });

  it("requires wood and stone before build_bench is affordable", () => {
    const ready = { wood: 2, stone: 1, wheat: 0, cotton: 0 };
    expect(canAffordRecipePoolCost(ready, ENGLISH_CRAFT_BUILD_BENCH_RECIPE)).toBe(true);

    expect(canAffordRecipePoolCost({ ...ready, stone: 0 }, ENGLISH_CRAFT_BUILD_BENCH_RECIPE)).toBe(
      false,
    );
    expect(canAffordRecipePoolCost({ ...ready, wood: 1 }, ENGLISH_CRAFT_BUILD_BENCH_RECIPE)).toBe(
      false,
    );
  });

  it("lists missing build_bench resources and formats a readable error", () => {
    expect(
      missingRecipePoolResources(
        { wood: 2, stone: 0, wheat: 5, cotton: 2 },
        ENGLISH_CRAFT_BUILD_BENCH_RECIPE,
      ),
    ).toEqual(["stone"]);
    expect(
      formatMissingRecipeResources(["stone"], ENGLISH_CRAFT_BUILD_BENCH_RECIPE),
    ).toBe("Need more stone to build workbench.");
    expect(
      formatMissingRecipeResources(["wood"], ENGLISH_CRAFT_BUILD_BENCH_RECIPE),
    ).toBe("Need more wood to build workbench.");
  });

  it("blocks build_bench when stone is below cost", () => {
    expect(
      canStartCraftChallenge({
        session: { phase: "playing" },
        resourcePool: { wood: 10, stone: 0, wheat: 5, cotton: 4 },
        craftedItems: { benchBuilt: false },
      }),
    ).toBe(false);
  });
});

describe("english-craft phase 3f victory stats", () => {
  it("groups harvested counts by resource type", () => {
    expect(
      sumHarvestedByType({
        "tree-01": {
          id: "tree-01",
          resourceType: "wood",
          available: true,
          cooldownEndsAt: null,
          collectedCount: 2,
        },
        "stone-01": {
          id: "stone-01",
          resourceType: "stone",
          available: false,
          cooldownEndsAt: 1,
          collectedCount: 3,
        },
        "wheat-01": {
          id: "wheat-01",
          resourceType: "wheat",
          available: true,
          cooldownEndsAt: null,
          collectedCount: 1,
        },
      }),
    ).toEqual({ wood: 2, stone: 3, wheat: 1, cotton: 0 });
  });

  it("builds victory stats from pool and node harvest totals", () => {
    const nodes = {
      "tree-01": {
        id: "tree-01",
        resourceType: "wood" as const,
        available: true,
        cooldownEndsAt: null,
        collectedCount: 12,
      },
    };
    const pool = { wood: 0, stone: 0, wheat: 0, cotton: 0 };

    expect(buildVictoryResourceStats(nodes, pool)).toEqual({
      pool,
      gathered: { wood: 12, stone: 0, wheat: 0, cotton: 0 },
    });
  });
});
