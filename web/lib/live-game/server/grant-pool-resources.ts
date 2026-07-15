import "server-only";

import type { LiveGameResourceType } from "@/lib/live-game/liveblocks/config";
import { getLiveblocksServerClient } from "@/lib/live-game/server/liveblocks-client";
import {
  asLiveGameMutatorRoot,
  readMutatorNumber,
} from "@/lib/live-game/server/mutator";

/** Fixed teacher top-up amount for host HUD grants. */
export const LIVE_GAME_HOST_GRANT_POOL_AMOUNT = 5;

const RESOURCE_TYPES: ReadonlySet<string> = new Set(["wood", "stone", "wheat", "cotton"]);

export function isLiveGameResourceType(value: unknown): value is LiveGameResourceType {
  return typeof value === "string" && RESOURCE_TYPES.has(value);
}

export type GrantPoolResourcesResult = {
  resourceType: LiveGameResourceType;
  amount: number;
  poolCount: number;
};

/**
 * Host-only shared-pool top-up for playtesting / late-game testing.
 * Mutates Liveblocks Storage resourcePool; does not create award receipts or carry.
 */
export async function grantPoolResources(input: {
  roomId: string;
  resourceType: LiveGameResourceType;
  amount?: number;
}): Promise<GrantPoolResourcesResult | null> {
  const amount =
    typeof input.amount === "number" && Number.isFinite(input.amount) && input.amount > 0 ?
      Math.floor(input.amount)
    : LIVE_GAME_HOST_GRANT_POOL_AMOUNT;

  const liveblocks = getLiveblocksServerClient();
  let result: GrantPoolResourcesResult | null = null;

  await liveblocks.mutateStorage(input.roomId, ({ root }) => {
    const storage = asLiveGameMutatorRoot(root as unknown as { get: (key: string) => unknown });
    const session = storage.get("session");
    if (!session || session.get("phase") !== "playing") {
      return;
    }

    const resourcePool = storage.get("resourcePool");
    if (!resourcePool) return;

    const nextCount = readMutatorNumber(resourcePool.get(input.resourceType)) + amount;
    resourcePool.set(input.resourceType, nextCount);
    result = {
      resourceType: input.resourceType,
      amount,
      poolCount: nextCount,
    };
  });

  return result;
}
