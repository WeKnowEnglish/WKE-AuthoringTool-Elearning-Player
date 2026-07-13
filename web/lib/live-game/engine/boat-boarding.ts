import { playerSceneRect } from "@/lib/explore/explore-scene-engine";
import { rectsOverlap, type Rect } from "@/lib/teststartpage/chase-game-physics";
import type { LiveGamePlayerPosition } from "@/lib/live-game/liveblocks/config";

export const BOAT_BOARDING_DWELL_MS = 2_000;
export const PLAYER_POSITION_STALE_MS = 5_000;

export function isPlayerInBoatBoardingZone(
  playerX: number,
  playerY: number,
  zone: Rect,
): boolean {
  return rectsOverlap(playerSceneRect(playerX, playerY), zone);
}

export function updateBoatBoardingDwell(
  currentDwellMs: number,
  onBoatCount: number,
  totalPlayers: number,
  elapsedMs: number,
): number {
  if (totalPlayers <= 0 || onBoatCount !== totalPlayers) return 0;
  return currentDwellMs + elapsedMs;
}

export function isBoatBoardingDwellComplete(dwellMs: number): boolean {
  return dwellMs >= BOAT_BOARDING_DWELL_MS;
}

export function getFreshPlayerPositions(
  positions: Record<string, LiveGamePlayerPosition> | undefined,
  now: number,
  staleMs = PLAYER_POSITION_STALE_MS,
): Array<{ playerId: string; x: number; y: number }> {
  if (!positions) return [];
  return Object.entries(positions)
    .filter(([, position]) => now - position.updatedAt <= staleMs)
    .map(([playerId, position]) => ({
      playerId,
      x: position.x,
      y: position.y,
    }));
}

export function areAllFreshPlayersOnBoat(
  positions: Record<string, LiveGamePlayerPosition> | undefined,
  zone: Rect,
  now: number,
): boolean {
  const fresh = getFreshPlayerPositions(positions, now);
  if (fresh.length === 0) return false;
  return fresh.every((entry) => isPlayerInBoatBoardingZone(entry.x, entry.y, zone));
}

export function areAllRegisteredPlayersOnBoat(
  playerIds: readonly string[],
  positions: Record<string, LiveGamePlayerPosition> | undefined,
  zone: Rect,
  now: number,
  staleMs = PLAYER_POSITION_STALE_MS,
): boolean {
  if (playerIds.length === 0) return false;
  return playerIds.every((playerId) => {
    const position = positions?.[playerId];
    if (!position || now - position.updatedAt > staleMs) return false;
    return isPlayerInBoatBoardingZone(position.x, position.y, zone);
  });
}

export function countPlayersOnBoat(
  players: ReadonlyArray<{ x: number; y: number }>,
  zone: Rect,
): number {
  return players.filter((player) => isPlayerInBoatBoardingZone(player.x, player.y, zone)).length;
}
