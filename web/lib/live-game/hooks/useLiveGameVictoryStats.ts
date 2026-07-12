"use client";

import type { LiveGameResourcePool, LiveGameResourceType } from "@/lib/live-game/liveblocks/config";
import type { LiveGameResourceNodeState } from "@/lib/live-game/liveblocks/config";

export type VictoryResourceStats = {
  pool: LiveGameResourcePool;
  gathered: Record<LiveGameResourceType, number>;
};

export function sumHarvestedByType(
  resourceNodes: Record<string, LiveGameResourceNodeState>,
): Record<LiveGameResourceType, number> {
  const gathered: Record<LiveGameResourceType, number> = {
    wood: 0,
    stone: 0,
    wheat: 0,
    cotton: 0,
  };

  for (const node of Object.values(resourceNodes)) {
    gathered[node.resourceType] += node.collectedCount ?? 0;
  }

  return gathered;
}

export function buildVictoryResourceStats(
  resourceNodes: Record<string, LiveGameResourceNodeState>,
  pool: LiveGameResourcePool,
): VictoryResourceStats {
  return {
    pool,
    gathered: sumHarvestedByType(resourceNodes),
  };
}

/** @deprecated Use sumHarvestedByType */
export function sumTreesChopped(resourceNodes: Record<string, LiveGameResourceNodeState>): number {
  let total = 0;
  for (const node of Object.values(resourceNodes)) {
    total += node.collectedCount ?? 0;
  }
  return total;
}
