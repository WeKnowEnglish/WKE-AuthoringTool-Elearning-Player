import type { LiveGamePlayerInventory, LiveGameStorageSnapshot } from "@/lib/live-game/liveblocks/config";

export const EMPTY_LIVE_GAME_PLAYER_INVENTORY: LiveGamePlayerInventory = {
  bread: 0,
};

export function readPlayerInventory(
  storage: LiveGameStorageSnapshot | null | undefined,
  playerId: string,
): LiveGamePlayerInventory {
  const raw = storage?.playerInventory?.[playerId];
  return {
    bread: Math.max(0, raw?.bread ?? 0),
  };
}
