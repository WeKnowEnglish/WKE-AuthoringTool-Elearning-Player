import type {
  LiveGamePlayerInventory,
  LiveGameStorageSnapshot,
} from "@/lib/live-game/liveblocks/config";

export const EMPTY_LIVE_GAME_PLAYER_INVENTORY: LiveGamePlayerInventory = {
  bread: 0,
  backpack: false,
};

export function readPlayerInventory(
  storage: Pick<LiveGameStorageSnapshot, "playerInventory"> | null | undefined,
  playerId: string,
): LiveGamePlayerInventory {
  const raw = storage?.playerInventory?.[playerId];
  return {
    bread: Math.max(0, raw?.bread ?? 0),
    backpack: raw?.backpack === true,
  };
}
