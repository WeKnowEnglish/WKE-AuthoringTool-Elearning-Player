import { playerSceneRect } from "@/lib/explore/explore-scene-engine";
import { rectsOverlap, type Rect } from "@/lib/teststartpage/chase-game-physics";

export function isPlayerTouchingFlagZone(
  playerX: number,
  playerY: number,
  flagZone: Rect,
): boolean {
  return rectsOverlap(playerSceneRect(playerX, playerY), flagZone);
}
