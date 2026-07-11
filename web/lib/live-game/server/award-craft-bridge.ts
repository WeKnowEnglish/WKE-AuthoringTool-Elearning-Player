import { LiveMap, LiveObject } from "@liveblocks/client";
import type { LiveGameCraftReceipt } from "@/lib/live-game/liveblocks/config";
import { ENGLISH_CRAFT_CRAFT_WOOD_COST } from "@/lib/live-game/modes/english-craft/gameplay-v1";
import { getLiveblocksServerClient } from "@/lib/live-game/server/liveblocks-client";
import {
  asLiveGameMutatorRoot,
  readMutatorNumber,
  type LiveGameMutatorNode,
} from "@/lib/live-game/server/mutator";

export type AwardCraftBridgeResult = {
  wood: number;
  bridgeCrafted: boolean;
  riverCrossingUnlocked: boolean;
  alreadyCrafted: boolean;
};

function readMutatorBoolean(value: unknown): boolean {
  return value === true;
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
      result = {
        wood: readMutatorNumber(priorReceipt.get("wood")),
        bridgeCrafted: readMutatorBoolean(priorReceipt.get("bridgeCrafted")),
        riverCrossingUnlocked: readMutatorBoolean(priorReceipt.get("bridgeCrafted")),
        alreadyCrafted: true,
      };
      return;
    }

    let craftedItems = storage.get("craftedItems");
    if (!craftedItems) {
      craftedItems = new LiveObject({ bridge: false }) as unknown as LiveGameMutatorNode;
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

    const currentWood = readMutatorNumber(resourcePool.get("wood"));
    if (currentWood < ENGLISH_CRAFT_CRAFT_WOOD_COST) return;

    const nextWood = currentWood - ENGLISH_CRAFT_CRAFT_WOOD_COST;
    resourcePool.set("wood", nextWood);
    craftedItems.set("bridge", true);
    unlockedObjects.set("river_crossing", true);

    result = {
      wood: nextWood,
      bridgeCrafted: true,
      riverCrossingUnlocked: true,
      alreadyCrafted: false,
    };
    craftReceipts.set(
      input.challengeId,
      new LiveObject<LiveGameCraftReceipt>({ wood: nextWood, bridgeCrafted: true }),
    );
  });

  return result;
}
