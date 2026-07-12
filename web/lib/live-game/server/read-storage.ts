import type { LiveGameStorageSnapshot } from "@/lib/live-game/liveblocks/config";
import { isEnglishCraftResourceNodeInteractable } from "@/lib/live-game/modes/english-craft/gameplay-v1";
import {
  canBuildBench,
  canCraftAtBench,
  canStartRecipeCraft,
  type CraftRecipeId,
} from "@/lib/live-game/modes/english-craft/craft-recipes-v1";
import { getLiveblocksServerClient } from "@/lib/live-game/server/liveblocks-client";
import { sessionIdFromRoomId } from "@/lib/live-game/liveblocks/room-id";
import { canAffordCraftCosts, getPoolCount, readResourcePool } from "@/lib/live-game/resource-pool";
import { readCraftedItems } from "@/lib/live-game/server/read-crafted-items";

export async function readLiveGameStorageJson(roomId: string): Promise<LiveGameStorageSnapshot | null> {
  if (!sessionIdFromRoomId(roomId)) return null;
  const liveblocks = getLiveblocksServerClient();
  try {
    const storage = await liveblocks.getStorageDocument(roomId, "json");
    return storage as unknown as LiveGameStorageSnapshot;
  } catch {
    return null;
  }
}

export function isResourceNodeAvailable(
  node: { available: boolean; cooldownEndsAt: number | null } | undefined,
  now = Date.now(),
): boolean {
  return isEnglishCraftResourceNodeInteractable(node, now);
}

export function isBoatBoardingUnlocked(storage: LiveGameStorageSnapshot | null | undefined): boolean {
  return storage?.unlockedObjects?.boat_boarding === true;
}

/** @deprecated Use canStartRecipeCraft(storage, "build_bench") */
export function canStartCraftChallenge(storage: LiveGameStorageSnapshot | null | undefined): boolean {
  return canStartRecipeCraft(storage, "build_bench");
}

export { canBuildBench, canCraftAtBench, canStartRecipeCraft };

export { readResourcePool, getPoolCount };

export function canCompleteObjective(storage: LiveGameStorageSnapshot | null | undefined): boolean {
  if (!storage?.session || storage.session.phase !== "playing") return false;
  return isBoatBoardingUnlocked(storage);
}

export type { CraftRecipeId };
