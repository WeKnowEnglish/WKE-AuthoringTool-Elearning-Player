import { LiveMap, LiveObject } from "@liveblocks/client";
import type {
  LiveGameCraftReceipt,
  LiveGameCraftedItems,
  LiveGameResourcePool,
  LiveGameStorageSnapshot,
} from "@/lib/live-game/liveblocks/config";
import {
  canAffordRecipeCraftedCost,
  canAffordRecipePoolCost,
  getCraftRecipe,
  type CraftRecipeId,
} from "@/lib/live-game/modes/english-craft/craft-recipes-v1";
import { getLiveblocksServerClient } from "@/lib/live-game/server/liveblocks-client";
import { DEFAULT_LIVE_GAME_CRAFTED_ITEMS, readCraftedItems } from "@/lib/live-game/server/read-crafted-items";
import {
  asLiveGameMutatorRoot,
  readMutatorNumber,
  type LiveGameMutatorNode,
} from "@/lib/live-game/server/mutator";
import { readResourcePool } from "@/lib/live-game/resource-pool";

export type AwardCraftRecipeResult = {
  recipeId: CraftRecipeId;
  poolTotal: LiveGameResourcePool;
  craftedItems: LiveGameCraftedItems;
  alreadyAwarded: boolean;
};

function readMutatorBoolean(value: unknown): boolean {
  return value === true;
}

function readPoolFromMutator(resourcePool: LiveGameMutatorNode): LiveGameResourcePool {
  return {
    wood: readMutatorNumber(resourcePool.get("wood")),
    stone: readMutatorNumber(resourcePool.get("stone")),
    wheat: readMutatorNumber(resourcePool.get("wheat")),
    cotton: readMutatorNumber(resourcePool.get("cotton")),
  };
}

function readCraftedFromMutator(craftedItems: LiveGameMutatorNode): LiveGameCraftedItems {
  return {
    benchBuilt: readMutatorBoolean(craftedItems.get("benchBuilt")),
    hammers: readMutatorNumber(craftedItems.get("hammers")),
    boat: readMutatorBoolean(craftedItems.get("boat")),
    bridge: readMutatorBoolean(craftedItems.get("bridge")),
  };
}

function applyRecipeGrants(craftedItems: LiveGameMutatorNode, grants: ReturnType<typeof getCraftRecipe>["grants"]) {
  if (grants.benchBuilt) {
    craftedItems.set("benchBuilt", true);
  }
  if (grants.hammers != null) {
    const current = readMutatorNumber(craftedItems.get("hammers"));
    craftedItems.set("hammers", current + grants.hammers);
  }
  if (grants.boat) {
    craftedItems.set("boat", true);
  }
}

function meetsRecipeRequiresForAward(
  crafted: LiveGameCraftedItems,
  requires: ReturnType<typeof getCraftRecipe>["requires"],
): boolean {
  if (requires.benchNotBuilt && crafted.benchBuilt) return false;
  if (requires.benchBuilt && !crafted.benchBuilt) return false;
  if (requires.boatNotBuilt && crafted.boat) return false;
  if (requires.maxHammers != null && crafted.hammers >= requires.maxHammers) return false;
  return true;
}

export async function awardCraftRecipe(input: {
  roomId: string;
  challengeId: string;
  recipeId: CraftRecipeId;
}): Promise<AwardCraftRecipeResult | null> {
  const recipe = getCraftRecipe(input.recipeId);
  const liveblocks = getLiveblocksServerClient();
  let result: AwardCraftRecipeResult | null = null;

  await liveblocks.mutateStorage(input.roomId, ({ root }) => {
    const storage = asLiveGameMutatorRoot(root as unknown as { get: (key: string) => unknown });
    const session = storage.get("session");
    if (!session || session.get("phase") !== "playing") {
      return;
    }

    let craftReceipts = storage.get("craftReceipts");
    if (!craftReceipts) {
      craftReceipts = new LiveMap<string, LiveObject<LiveGameCraftReceipt>>() as unknown as LiveGameMutatorNode;
      storage.set("craftReceipts", craftReceipts);
    }

    const priorReceipt = craftReceipts.get(input.challengeId) as LiveGameMutatorNode | undefined;
    if (priorReceipt) {
      const poolTotal: LiveGameResourcePool = {
        wood: readMutatorNumber(priorReceipt.get("wood")),
        stone: readMutatorNumber(priorReceipt.get("stone")),
        wheat: readMutatorNumber(priorReceipt.get("wheat")),
        cotton: readMutatorNumber(priorReceipt.get("cotton")),
      };
      const craftedItems: LiveGameCraftedItems = {
        benchBuilt: readMutatorBoolean(priorReceipt.get("benchBuilt")),
        hammers: readMutatorNumber(priorReceipt.get("hammers")),
        boat: readMutatorBoolean(priorReceipt.get("boatCrafted")),
        bridge: readMutatorBoolean(priorReceipt.get("bridgeCrafted")),
      };
      let craftedItemsNode = storage.get("craftedItems");
      if (craftedItemsNode) {
        Object.assign(craftedItems, readCraftedFromMutator(craftedItemsNode));
      }
      result = {
        recipeId: input.recipeId,
        poolTotal,
        craftedItems,
        alreadyAwarded: true,
      };
      return;
    }

    let craftedItems = storage.get("craftedItems");
    if (!craftedItems) {
      craftedItems = new LiveObject({ ...DEFAULT_LIVE_GAME_CRAFTED_ITEMS }) as unknown as LiveGameMutatorNode;
      storage.set("craftedItems", craftedItems);
    }

    const currentCrafted = readCraftedFromMutator(craftedItems);
    if (!meetsRecipeRequiresForAward(currentCrafted, recipe.requires)) return;

    const resourcePool = storage.get("resourcePool");
    if (!resourcePool) return;

    const currentPool = readPoolFromMutator(resourcePool);
    if (!canAffordRecipePoolCost(currentPool, recipe)) return;
    if (!canAffordRecipeCraftedCost(currentCrafted, recipe)) return;

    const nextPool: LiveGameResourcePool = { ...currentPool };
    for (const type of ["wood", "stone", "wheat", "cotton"] as const) {
      const cost = recipe.poolCost[type] ?? 0;
      if (cost > 0) {
        nextPool[type] = currentPool[type] - cost;
        resourcePool.set(type, nextPool[type]);
      }
    }

    if (recipe.craftedCost?.hammers != null) {
      craftedItems.set("hammers", currentCrafted.hammers - recipe.craftedCost.hammers);
    }

    applyRecipeGrants(craftedItems, recipe.grants);

    if (recipe.grants.boat) {
      let unlockedObjects = storage.get("unlockedObjects");
      if (!unlockedObjects) {
        unlockedObjects = new LiveObject({ river_crossing: false, boat_boarding: false }) as unknown as LiveGameMutatorNode;
        storage.set("unlockedObjects", unlockedObjects);
      }
      unlockedObjects.set("boat_boarding", true);
    }

    const finalCrafted = readCraftedFromMutator(craftedItems);

    result = {
      recipeId: input.recipeId,
      poolTotal: nextPool,
      craftedItems: finalCrafted,
      alreadyAwarded: false,
    };

    craftReceipts.set(
      input.challengeId,
      new LiveObject<LiveGameCraftReceipt>({
        recipeId: input.recipeId,
        wood: nextPool.wood,
        stone: nextPool.stone,
        wheat: nextPool.wheat,
        cotton: nextPool.cotton,
        benchBuilt: finalCrafted.benchBuilt,
        hammers: finalCrafted.hammers,
        boatCrafted: finalCrafted.boat,
      }),
    );
  });

  return result;
}

/** Test helper: simulate award without Liveblocks. */
export function applyCraftRecipeAwardToSnapshot(
  storage: LiveGameStorageSnapshot,
  recipeId: CraftRecipeId,
): LiveGameStorageSnapshot | null {
  const recipe = getCraftRecipe(recipeId);
  const crafted = readCraftedItems(storage);
  if (!meetsRecipeRequiresForAward(crafted, recipe.requires)) return null;

  const pool = readResourcePool(storage);
  if (!canAffordRecipePoolCost(pool, recipe)) return null;
  if (!canAffordRecipeCraftedCost(crafted, recipe)) return null;

  const nextPool: LiveGameResourcePool = { ...pool };
  for (const type of ["wood", "stone", "wheat", "cotton"] as const) {
    const cost = recipe.poolCost[type] ?? 0;
    if (cost > 0) nextPool[type] = pool[type] - cost;
  }

  const nextCrafted: LiveGameCraftedItems = { ...crafted };
  if (recipe.craftedCost?.hammers != null) {
    nextCrafted.hammers -= recipe.craftedCost.hammers;
  }
  if (recipe.grants.benchBuilt) nextCrafted.benchBuilt = true;
  if (recipe.grants.hammers != null) nextCrafted.hammers += recipe.grants.hammers;
  if (recipe.grants.boat) nextCrafted.boat = true;

  const nextUnlocked = {
    river_crossing: storage.unlockedObjects?.river_crossing === true,
    boat_boarding:
      recipe.grants.boat ? true : storage.unlockedObjects?.boat_boarding === true,
  };

  return {
    ...storage,
    resourcePool: nextPool,
    craftedItems: nextCrafted,
    unlockedObjects: nextUnlocked,
  };
}
