import { LiveMap, LiveObject } from "@liveblocks/client";
import type { LiveGameCraftReceipt, LiveGameResourcePool } from "@/lib/live-game/liveblocks/config";
import { ENGLISH_CRAFT_CRAFT_COSTS } from "@/lib/live-game/modes/english-craft/gameplay-v1";
import { getLiveblocksServerClient } from "@/lib/live-game/server/liveblocks-client";
import { DEFAULT_LIVE_GAME_CRAFTED_ITEMS } from "@/lib/live-game/server/read-crafted-items";
import {
  asLiveGameMutatorRoot,
  readMutatorNumber,
  type LiveGameMutatorNode,
} from "@/lib/live-game/server/mutator";
import { canAffordCraftCosts, readResourcePool } from "@/lib/live-game/resource-pool";

export type AwardCraftBridgeResult = {
  poolTotal: LiveGameResourcePool;
  bridgeCrafted: boolean;
  riverCrossingUnlocked: boolean;
  alreadyCrafted: boolean;
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

export async function awardCraftBridge(input: {
  roomId: string;
  challengeId: string;
}): Promise<AwardCraftBridgeResult | null> {
  const liveblocks = getLiveblocksServerClient();
  let result: AwardCraftBridgeResult | null = null;

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
      result = {
        poolTotal,
        bridgeCrafted: readMutatorBoolean(priorReceipt.get("bridgeCrafted")),
        riverCrossingUnlocked: readMutatorBoolean(priorReceipt.get("bridgeCrafted")),
        alreadyCrafted: true,
      };
      return;
    }

    let craftedItems = storage.get("craftedItems");
    if (!craftedItems) {
      craftedItems = new LiveObject({ ...DEFAULT_LIVE_GAME_CRAFTED_ITEMS }) as unknown as LiveGameMutatorNode;
      storage.set("craftedItems", craftedItems);
    }
    let unlockedObjects = storage.get("unlockedObjects");
    if (!unlockedObjects) {
      unlockedObjects = new LiveObject({ river_crossing: false }) as unknown as LiveGameMutatorNode;
      storage.set("unlockedObjects", unlockedObjects);
    }

    if (readMutatorBoolean(craftedItems.get("bridge"))) {
      return;
    }

    const resourcePool = storage.get("resourcePool");
    if (!resourcePool) return;

    const currentPool = readPoolFromMutator(resourcePool);
    if (!canAffordCraftCosts(currentPool, ENGLISH_CRAFT_CRAFT_COSTS)) return;

    const nextPool: LiveGameResourcePool = {
      wood: currentPool.wood - ENGLISH_CRAFT_CRAFT_COSTS.wood,
      stone: currentPool.stone - ENGLISH_CRAFT_CRAFT_COSTS.stone,
      wheat: currentPool.wheat - ENGLISH_CRAFT_CRAFT_COSTS.wheat,
      cotton: currentPool.cotton - ENGLISH_CRAFT_CRAFT_COSTS.cotton,
    };

    resourcePool.set("wood", nextPool.wood);
    resourcePool.set("stone", nextPool.stone);
    resourcePool.set("wheat", nextPool.wheat);
    resourcePool.set("cotton", nextPool.cotton);
    craftedItems.set("bridge", true);
    unlockedObjects.set("river_crossing", true);

    result = {
      poolTotal: nextPool,
      bridgeCrafted: true,
      riverCrossingUnlocked: true,
      alreadyCrafted: false,
    };
    craftReceipts.set(
      input.challengeId,
      new LiveObject<LiveGameCraftReceipt>({
        wood: nextPool.wood,
        stone: nextPool.stone,
        wheat: nextPool.wheat,
        cotton: nextPool.cotton,
        bridgeCrafted: true,
      }),
    );
  });

  return result;
}
