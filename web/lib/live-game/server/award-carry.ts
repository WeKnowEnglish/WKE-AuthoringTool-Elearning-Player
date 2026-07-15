import { ENGLISH_CRAFT_TREE_COOLDOWN_MS } from "@/lib/live-game/modes/english-craft/gameplay-v1";
import { LiveMap, LiveObject } from "@liveblocks/client";
import type { LiveGameAwardReceipt, LiveGameResourceType } from "@/lib/live-game/liveblocks/config";
import { appendCarrySlot } from "@/lib/live-game/carry-bag";
import { getLiveblocksServerClient } from "@/lib/live-game/server/liveblocks-client";
import { normalizeAwardReceipt } from "@/lib/live-game/server/award-receipt";
import {
  readPlayerCarryBagFromMutator,
  writePlayerCarryBagToMutator,
} from "@/lib/live-game/server/player-carry";
import {
  asLiveGameMutatorRoot,
  readMutatorNumber,
  readMutatorString,
  type LiveGameMutatorNode,
} from "@/lib/live-game/server/mutator";

export type AwardCarryResult = {
  resourceType: LiveGameResourceType;
  sourceNodeId: string;
  nodeCooldownEndsAt: number;
  alreadyAwarded: boolean;
};

export async function awardCarryForNode(input: {
  roomId: string;
  playerId: string;
  nodeId: string;
  challengeId: string;
  questionId: string;
}): Promise<AwardCarryResult | null> {
  const liveblocks = getLiveblocksServerClient();
  let result: AwardCarryResult | null = null;

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
    if (priorReceipt?.awardKind === "carry") {
      result = {
        resourceType: priorReceipt.resourceType,
        sourceNodeId: input.nodeId,
        nodeCooldownEndsAt: priorReceipt.nodeCooldownEndsAt,
        alreadyAwarded: true,
      };
      return;
    }

    const inventoryEntry = storage.get("playerInventory")?.get(input.playerId) as
      | LiveGameMutatorNode
      | undefined;
    const capacity = inventoryEntry?.get("backpack") === true ? 4 : 1;
    const existingBag = readPlayerCarryBagFromMutator(storage, input.playerId, capacity);

    const resourceNodes = storage.get("resourceNodes");
    if (!resourceNodes) return;

    const node = resourceNodes.get(input.nodeId) as LiveGameMutatorNode | undefined;
    if (!node) return;

    const cooldownEndsAt = node.get("cooldownEndsAt");
    const now = Date.now();
    if (typeof cooldownEndsAt === "number" && cooldownEndsAt > now) return;

    const resourceType = readMutatorString(node.get("resourceType")) as LiveGameResourceType | null;
    if (!resourceType) return;

    const nextBag = appendCarrySlot(
      existingBag,
      {
        kind: "resource",
        resourceType,
        sourceNodeId: input.nodeId,
        questionId: input.questionId,
        harvestedAt: now,
      },
      capacity,
    );
    if (!nextBag) return;

    writePlayerCarryBagToMutator(storage, input.playerId, nextBag);

    const nextCooldown = now + ENGLISH_CRAFT_TREE_COOLDOWN_MS;
    node.set("available", false);
    node.set("cooldownEndsAt", nextCooldown);
    node.set("collectedCount", readMutatorNumber(node.get("collectedCount")) + 1);

    result = {
      resourceType,
      sourceNodeId: input.nodeId,
      nodeCooldownEndsAt: nextCooldown,
      alreadyAwarded: false,
    };

    awardReceipts.set(
      input.challengeId,
      new LiveObject<LiveGameAwardReceipt>({
        awardKind: "carry",
        resourceType,
        nodeCooldownEndsAt: nextCooldown,
      }),
    );
  });

  return result;
}
