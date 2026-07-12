import type { LiveGamePlayerHunger, LiveGameStorageSnapshot } from "@/lib/live-game/liveblocks/config";

export const FULL_LIVE_GAME_PLAYER_HUNGER = 100;

export const DEFAULT_LIVE_GAME_PLAYER_HUNGER: LiveGamePlayerHunger = {
  value: FULL_LIVE_GAME_PLAYER_HUNGER,
  lastUpdatedAt: 0,
};

export function readPlayerHunger(
  storage: LiveGameStorageSnapshot | null | undefined,
  playerId: string,
): LiveGamePlayerHunger {
  const raw = storage?.playerHunger?.[playerId];
  if (!raw) {
    return { ...DEFAULT_LIVE_GAME_PLAYER_HUNGER };
  }
  return {
    value: Math.max(0, Math.min(FULL_LIVE_GAME_PLAYER_HUNGER, raw.value ?? 0)),
    lastUpdatedAt: raw.lastUpdatedAt ?? 0,
  };
}
