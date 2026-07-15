import { LiveMap, LiveObject } from "@liveblocks/client";
import type {
  LiveGameCraftReceipt,
  LiveGameCraftedItems,
  LiveGamePlayerInventory,
  LiveGameResourcePool,
  LiveGameStorageSnapshot,
} from "@/lib/live-game/liveblocks/config";
import {
  appendCarrySlot,
  hasFreeCarrySlot,
  normalizePlayerCarry,
  playerCarryIsFull,
} from "@/lib/live-game/carry-bag";
import {
  canAffordRecipeCraftedCost,
  canAffordRecipePoolCost,
  getCraftRecipe,
  type CraftRecipeId,
} from "@/lib/live-game/modes/english-craft/craft-recipes-v1";
import { getLiveblocksServerClient } from "@/lib/live-game/server/liveblocks-client";
import { DEFAULT_LIVE_GAME_CRAFTED_ITEMS, readCraftedItems } from "@/lib/live-game/server/read-crafted-items";
import {
  readPlayerCarryBagFromMutator,
  writePlayerCarryBagToMutator,
} from "@/lib/live-game/server/player-carry";
import {
  asLiveGameMutatorRoot,
  readMutatorNumber,
  type LiveGameMutatorNode,
} from "@/lib/live-game/server/mutator";
import { readResourcePool } from "@/lib/live-game/resource-pool";
import { EMPTY_LIVE_GAME_PLAYER_INVENTORY } from "@/lib/live-game/server/read-player-inventory";

export type AwardCraftRecipeResult = {
  recipeId: CraftRecipeId;
  poolTotal: LiveGameResourcePool;
  craftedItems: LiveGameCraftedItems;
  inventory?: LiveGamePlayerInventory;
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

function ensureInventoryEntry(
  storage: ReturnType<typeof asLiveGameMutatorRoot>,
  playerId: string,
): LiveGameMutatorNode {
  let playerInventory = storage.get("playerInventory");
  if (!playerInventory) {
    playerInventory = new LiveMap() as unknown as LiveGameMutatorNode;
    storage.set("playerInventory", playerInventory);
  }

  let entry = playerInventory.get(playerId) as LiveGameMutatorNode | undefined;
  if (!entry) {
    entry = new LiveObject<LiveGamePlayerInventory>({
      ...EMPTY_LIVE_GAME_PLAYER_INVENTORY,
    }) as unknown as LiveGameMutatorNode;
    playerInventory.set(playerId, entry);
  }
  return entry;
}

function readInventoryFromMutator(entry: LiveGameMutatorNode): LiveGamePlayerInventory {
  return {
    bread: readMutatorNumber(entry.get("bread")),
    backpack: entry.get("backpack") === true,
  };
}

function applyBreadCarryGrant(
  storage: ReturnType<typeof asLiveGameMutatorRoot>,
  playerId: string,
  amount: number,
): LiveGamePlayerInventory | null {
  const inventoryEntry = ensureInventoryEntry(storage, playerId);
  const inventory = readInventoryFromMutator(inventoryEntry);
  const capacity = inventory.backpack ? 4 : 1;
  let bag = readPlayerCarryBagFromMutator(storage, playerId, capacity);
  const now = Date.now();

  for (let i = 0; i < amount; i += 1) {
    const next = appendCarrySlot(bag, { kind: "bread", craftedAt: now }, capacity);
    if (!next) return null;
    bag = next;
  }

  writePlayerCarryBagToMutator(storage, playerId, bag);
  return inventory;
}

function applyBackpackGrant(
  storage: ReturnType<typeof asLiveGameMutatorRoot>,
  playerId: string,
): LiveGamePlayerInventory {
  const entry = ensureInventoryEntry(storage, playerId);
  entry.set("backpack", true);
  return readInventoryFromMutator(entry);
}

export async function awardCraftRecipe(input: {
  roomId: string;
  challengeId: string;
  recipeId: CraftRecipeId;
  playerId: string;
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
      };
      let craftedItemsNode = storage.get("craftedItems");
      if (craftedItemsNode) {
        Object.assign(craftedItems, readCraftedFromMutator(craftedItemsNode));
      }
      const inventoryEntry = storage.get("playerInventory")?.get(input.playerId) as
        | LiveGameMutatorNode
        | undefined;
      result = {
        recipeId: input.recipeId,
        poolTotal,
        craftedItems,
        inventory: inventoryEntry ? readInventoryFromMutator(inventoryEntry) : undefined,
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

    const inventoryPreview = (() => {
      const entry = storage.get("playerInventory")?.get(input.playerId) as LiveGameMutatorNode | undefined;
      return entry ?
          readInventoryFromMutator(entry)
        : { ...EMPTY_LIVE_GAME_PLAYER_INVENTORY };
    })();
    if (recipe.requires.backpackNotOwned && inventoryPreview.backpack) return;
    if (recipe.requires.freeCarrySlot) {
      const capacity = inventoryPreview.backpack ? 4 : 1;
      const bag = readPlayerCarryBagFromMutator(storage, input.playerId, capacity);
      if (!hasFreeCarrySlot(bag, capacity)) return;
    }

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

    let inventory: LiveGamePlayerInventory | undefined;
    if (recipe.grants.breadToCrafter != null && recipe.grants.breadToCrafter > 0) {
      inventory = applyBreadCarryGrant(storage, input.playerId, recipe.grants.breadToCrafter) ?? undefined;
      if (!inventory) return;
    }
    if (recipe.grants.backpackToCrafter) {
      inventory = applyBackpackGrant(storage, input.playerId);
    }

    if (recipe.grants.boat) {
      let unlockedObjects = storage.get("unlockedObjects");
      if (!unlockedObjects) {
        unlockedObjects = new LiveObject({ boat_boarding: false }) as unknown as LiveGameMutatorNode;
        storage.set("unlockedObjects", unlockedObjects);
      }
      unlockedObjects.set("boat_boarding", true);
    }

    const finalCrafted = readCraftedFromMutator(craftedItems);

    result = {
      recipeId: input.recipeId,
      poolTotal: nextPool,
      craftedItems: finalCrafted,
      inventory,
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
        breadGranted: recipe.grants.breadToCrafter,
        backpackGranted: recipe.grants.backpackToCrafter === true,
      }),
    );
  });

  return result;
}

/** Test helper: simulate award without Liveblocks. */
export function applyCraftRecipeAwardToSnapshot(
  storage: LiveGameStorageSnapshot,
  recipeId: CraftRecipeId,
  playerId?: string,
): LiveGameStorageSnapshot | null {
  const recipe = getCraftRecipe(recipeId);
  const crafted = readCraftedItems(storage);
  if (!meetsRecipeRequiresForAward(crafted, recipe.requires)) return null;

  const pool = readResourcePool(storage);
  if (!canAffordRecipePoolCost(pool, recipe)) return null;
  if (!canAffordRecipeCraftedCost(crafted, recipe)) return null;

  if (playerId) {
    const inventory = storage.playerInventory?.[playerId] ?? EMPTY_LIVE_GAME_PLAYER_INVENTORY;
    if (recipe.requires.backpackNotOwned && inventory.backpack) return null;
    if (recipe.requires.freeCarrySlot && playerCarryIsFull(storage, playerId)) return null;
  } else if (recipe.requires.backpackNotOwned || recipe.requires.freeCarrySlot) {
    return null;
  }

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
    boat_boarding:
      recipe.grants.boat ? true : storage.unlockedObjects?.boat_boarding === true,
  };

  let nextPlayerInventory = storage.playerInventory;
  let nextPlayerCarry = storage.playerCarry;
  if (playerId) {
    const current = storage.playerInventory?.[playerId] ?? { ...EMPTY_LIVE_GAME_PLAYER_INVENTORY };
    if (recipe.grants.backpackToCrafter) {
      nextPlayerInventory = {
        ...storage.playerInventory,
        [playerId]: { ...current, backpack: true },
      };
    }
    if (recipe.grants.breadToCrafter != null && recipe.grants.breadToCrafter > 0) {
      const capacity = (nextPlayerInventory?.[playerId]?.backpack ?? current.backpack) ? 4 : 1;
      let bag = normalizePlayerCarry(storage.playerCarry?.[playerId], capacity);
      for (let i = 0; i < recipe.grants.breadToCrafter; i += 1) {
        bag = appendCarrySlot(bag, { kind: "bread", craftedAt: Date.now() }, capacity);
        if (!bag) return null;
      }
      nextPlayerCarry = {
        ...storage.playerCarry,
        [playerId]: bag!,
      };
    }
  }

  return {
    ...storage,
    resourcePool: nextPool,
    craftedItems: nextCrafted,
    unlockedObjects: nextUnlocked,
    playerInventory: nextPlayerInventory,
    playerCarry: nextPlayerCarry,
  };
}
