import { LiveMap, LiveObject } from "@liveblocks/client";
import type { LiveGameAwardReceipt, LiveGameResourceType } from "@/lib/live-game/liveblocks/config";
import { getLiveblocksServerClient } from "@/lib/live-game/server/liveblocks-client";
import { normalizeAwardReceipt } from "@/lib/live-game/server/award-receipt";
import {
  asLiveGameMutatorRoot,
  readMutatorNumber,
  readMutatorString,
  type LiveGameMutatorNode,
} from "@/lib/live-game/server/mutator";

export type AwardDepositResult = {
  resourceType: LiveGameResourceType;
  poolCount: number;
  alreadyAwarded: boolean;
};

export async function awardDepositForCarry(input: {
  roomId: string;
  playerId: string;
  challengeId: string;
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
        alreadyAwarded: true,
      };
      return;
    }

    const playerCarry = storage.get("playerCarry");
    const carryNode = playerCarry?.get(input.playerId) as LiveGameMutatorNode | undefined;
    if (!carryNode) return;

    const resourceType = readMutatorString(carryNode.get("resourceType")) as LiveGameResourceType | null;
    if (!resourceType) return;

    const resourcePool = storage.get("resourcePool");
    if (!resourcePool) return;

    const nextCount = readMutatorNumber(resourcePool.get(resourceType)) + 1;
    resourcePool.set(resourceType, nextCount);

    (playerCarry as { delete?: (key: string) => void }).delete?.(input.playerId);

    result = {
      resourceType,
      poolCount: nextCount,
      alreadyAwarded: false,
    };

    awardReceipts.set(
      input.challengeId,
      new LiveObject<LiveGameAwardReceipt>({
        awardKind: "pool",
        resourceType,
        nodeCooldownEndsAt: 0,
        poolCount: nextCount,
      }),
    );
  });

  return result;
}
