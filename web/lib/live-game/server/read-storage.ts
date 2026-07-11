import type { LiveGameStorageSnapshot } from "@/lib/live-game/liveblocks/config";
import {
  ENGLISH_CRAFT_CRAFT_WOOD_COST,
  isEnglishCraftResourceNodeInteractable,
} from "@/lib/live-game/modes/english-craft/gameplay-v1";
import { getLiveblocksServerClient } from "@/lib/live-game/server/liveblocks-client";
import { sessionIdFromRoomId } from "@/lib/live-game/liveblocks/room-id";

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

export function isBridgeCrafted(storage: LiveGameStorageSnapshot | null | undefined): boolean {
  return storage?.craftedItems?.bridge === true;
}

export function isRiverCrossingUnlocked(storage: LiveGameStorageSnapshot | null | undefined): boolean {
  return storage?.unlockedObjects?.river_crossing === true;
}

export function canStartCraftChallenge(storage: LiveGameStorageSnapshot | null | undefined): boolean {
  if (!storage?.session || storage.session.phase !== "playing") return false;
  if (isBridgeCrafted(storage)) return false;
  const wood = storage.resourcePool?.wood ?? 0;
  return wood >= ENGLISH_CRAFT_CRAFT_WOOD_COST;
}

export function canCompleteObjective(storage: LiveGameStorageSnapshot | null | undefined): boolean {
  if (!storage?.session || storage.session.phase !== "playing") return false;
  return isBridgeCrafted(storage) && isRiverCrossingUnlocked(storage);
}
