import type { LiveGameStorageSnapshot } from "@/lib/live-game/liveblocks/config";
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
  if (!node) return false;
  if (!node.available) return false;
  if (node.cooldownEndsAt != null && node.cooldownEndsAt > now) return false;
  return true;
}
