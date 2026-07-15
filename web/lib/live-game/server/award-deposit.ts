import { LiveMap, LiveObject } from "@liveblocks/client";
import type { LiveGameAwardReceipt, LiveGameResourceType } from "@/lib/live-game/liveblocks/config";
import {
  bagHasMatchingResource,
  removeMatchingResourceSlots,
} from "@/lib/live-game/carry-bag";
import { getLiveblocksServerClient } from "@/lib/live-game/server/liveblocks-client";
import { normalizeAwardReceipt } from "@/lib/live-game/server/award-receipt";
import {
  readPlayerCarryBagFromMutator,
  writePlayerCarryBagToMutator,
} from "@/lib/live-game/server/player-carry";
import {
  asLiveGameMutatorRoot,
  readMutatorNumber,
  type LiveGameMutatorNode,
} from "@/lib/live-game/server/mutator";

export type AwardDepositResult = {
  resourceType: LiveGameResourceType;
  poolCount: number;
  depositedAmount: number;
  alreadyAwarded: boolean;
};

export async function awardDepositForCarry(input: {
  roomId: string;
  playerId: string;
  challengeId: string;
  resourceType: LiveGameResourceType;
}): Promise<AwardDepositResult | null> {
  const liveblocks = getLiveblocksServerClient();
  let result: AwardDepositResult | null = null;

  await liveblocks.mutateStorage(input.roomId, ({ root }) => {
    const storage = asLiveGameMutatorRoot(root as unknown as { get: (key: string) => unknown });
    const session = storage.get("session");
    if (!session || session.get("phase") !== "playing") {
      return;
    }

    let awardReceipts = storage.get("awardReceipts");
    if (!awardReceipts) {
      awardReceipts = new LiveMap<string, LiveObject<LiveGameAwardReceipt>>() as unknown as LiveGameMutatorNode;
      storage.set("awardReceipts", awardReceipts);
    }

    const priorReceipt = normalizeAwardReceipt(
      awardReceipts.get(input.challengeId) as LiveGameMutatorNode | undefined,
    );
    if (priorReceipt?.awardKind === "pool" && priorReceipt.poolCount != null) {
      result = {
        resourceType: priorReceipt.resourceType,
        poolCount: priorReceipt.poolCount,
        depositedAmount: priorReceipt.depositedAmount ?? 1,
        alreadyAwarded: true,
      };
      return;
    }

    const inventoryEntry = storage.get("playerInventory")?.get(input.playerId) as
      | LiveGameMutatorNode
      | undefined;
    const capacity = inventoryEntry?.get("backpack") === true ? 4 : 1;
    const bag = readPlayerCarryBagFromMutator(storage, input.playerId, capacity);
    if (!bag || !bagHasMatchingResource(bag, input.resourceType)) return;

    const { bag: nextBag, removedCount } = removeMatchingResourceSlots(bag, input.resourceType);
    if (removedCount < 1) return;

    const resourcePool = storage.get("resourcePool");
    if (!resourcePool) return;

    const nextCount = readMutatorNumber(resourcePool.get(input.resourceType)) + removedCount;
    resourcePool.set(input.resourceType, nextCount);
    writePlayerCarryBagToMutator(storage, input.playerId, nextBag);

    result = {
      resourceType: input.resourceType,
      poolCount: nextCount,
      depositedAmount: removedCount,
      alreadyAwarded: false,
    };

    awardReceipts.set(
      input.challengeId,
      new LiveObject<LiveGameAwardReceipt>({
        awardKind: "pool",
        resourceType: input.resourceType,
        nodeCooldownEndsAt: 0,
        poolCount: nextCount,
        depositedAmount: removedCount,
      }),
    );
  });

  return result;
}
