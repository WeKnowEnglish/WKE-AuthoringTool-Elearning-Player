import { ENGLISH_CRAFT_TREE_COOLDOWN_MS } from "@/lib/live-game/modes/english-craft/gameplay-v1";
import { LiveMap, LiveObject } from "@liveblocks/client";
import type { LiveGameAwardReceipt } from "@/lib/live-game/liveblocks/config";
import { getLiveblocksServerClient } from "@/lib/live-game/server/liveblocks-client";
import {
  asLiveGameMutatorRoot,
  readMutatorNumber,
  type LiveGameMutatorNode,
} from "@/lib/live-game/server/mutator";

export type AwardWoodResult = {
  wood: number;
  nodeCooldownEndsAt: number;
  alreadyAwarded: boolean;
};

export async function awardWoodForNode(input: {
  roomId: string;
  nodeId: string;
  challengeId: string;
}): Promise<AwardWoodResult | null> {
  const liveblocks = getLiveblocksServerClient();
  let result: AwardWoodResult | null = null;

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
    const priorReceipt = awardReceipts.get(input.challengeId) as LiveGameMutatorNode | undefined;
    if (priorReceipt) {
      result = {
        wood: readMutatorNumber(priorReceipt.get("wood")),
        nodeCooldownEndsAt: readMutatorNumber(priorReceipt.get("nodeCooldownEndsAt")),
        alreadyAwarded: true,
      };
      return;
    }

    const resourcePool = storage.get("resourcePool");
    const resourceNodes = storage.get("resourceNodes");
    if (!resourcePool || !resourceNodes) return;

    const node = resourceNodes.get(input.nodeId) as LiveGameMutatorNode | undefined;
    if (!node) return;

    const cooldownEndsAt = node.get("cooldownEndsAt");
    const now = Date.now();
    if (typeof cooldownEndsAt === "number" && cooldownEndsAt > now) return;

    const nextWood = readMutatorNumber(resourcePool.get("wood")) + 1;
    resourcePool.set("wood", nextWood);

    const nextCooldown = now + ENGLISH_CRAFT_TREE_COOLDOWN_MS;
    node.set("available", false);
    node.set("cooldownEndsAt", nextCooldown);
    node.set("collectedCount", readMutatorNumber(node.get("collectedCount")) + 1);

    result = {
      wood: nextWood,
      nodeCooldownEndsAt: nextCooldown,
      alreadyAwarded: false,
    };
    awardReceipts.set(
      input.challengeId,
      new LiveObject<LiveGameAwardReceipt>({ wood: nextWood, nodeCooldownEndsAt: nextCooldown }),
    );
  });

  return result;
}

/** Re-enable nodes whose cooldown has elapsed (called before issuing challenges). */
export async function refreshExpiredNodeCooldowns(roomId: string): Promise<void> {
  const liveblocks = getLiveblocksServerClient();
  const now = Date.now();

  await liveblocks.mutateStorage(roomId, ({ root }) => {
    const storage = asLiveGameMutatorRoot(root as unknown as { get: (key: string) => unknown });
    const resourceNodes = storage.get("resourceNodes");
    if (!resourceNodes) return;

    const keysFn = (resourceNodes as { keys?: () => Iterable<string> }).keys;
    const nodeIds = keysFn ? [...keysFn.call(resourceNodes)] : [];
    for (const nodeId of nodeIds) {
      const node = resourceNodes.get(nodeId) as LiveGameMutatorNode | undefined;
      if (!node) continue;
      const cooldownEndsAt = node.get("cooldownEndsAt");
      if (typeof cooldownEndsAt === "number" && cooldownEndsAt <= now) {
        node.set("available", true);
        node.set("cooldownEndsAt", null);
      }
    }
  });
}
