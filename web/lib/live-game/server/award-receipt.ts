import type { LiveGameAwardReceipt, LiveGameResourceType } from "@/lib/live-game/liveblocks/config";
import { readMutatorNumber, readMutatorString, type LiveGameMutatorNode } from "@/lib/live-game/server/mutator";

export function normalizeAwardReceipt(
  receipt: LiveGameAwardReceipt | LiveGameMutatorNode | null | undefined,
): LiveGameAwardReceipt | null {
  if (!receipt) return null;

  const read = (key: string) =>
    typeof (receipt as LiveGameMutatorNode).get === "function" ?
      (receipt as LiveGameMutatorNode).get(key)
    : (receipt as LiveGameAwardReceipt)[key as keyof LiveGameAwardReceipt];

  const awardKind = read("awardKind");
  const resourceType = read("resourceType");
  const nodeCooldownEndsAt = readMutatorNumber(read("nodeCooldownEndsAt"));
  const poolCount = readMutatorNumber(read("poolCount"));
  const legacyWood = readMutatorNumber(read("wood"));

  if (awardKind === "carry" || awardKind === "pool") {
    return {
      awardKind: awardKind as "carry" | "pool",
      resourceType: (readMutatorString(resourceType) ?? "wood") as LiveGameResourceType,
      nodeCooldownEndsAt,
      poolCount: poolCount > 0 ? poolCount : undefined,
    };
  }

  if (legacyWood > 0 || read("wood") != null) {
    return {
      awardKind: "pool",
      resourceType: "wood",
      nodeCooldownEndsAt,
      poolCount: legacyWood,
      wood: legacyWood,
    };
  }

  return null;
}
