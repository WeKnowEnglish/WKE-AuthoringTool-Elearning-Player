import {
  EXPLORE_SCENE_PLAYER_H,
  EXPLORE_SCENE_PLAYER_W,
} from "@/lib/explore/explore-scene-engine";

export type InteractablePoint = {
  id: string;
  x: number;
  y: number;
  interactRadius?: number;
};

export function expandInteractRadius<T extends InteractablePoint>(target: T, extraPx: number): T {
  return {
    ...target,
    interactRadius: (target.interactRadius ?? 64) + Math.max(0, extraPx),
  };
}

function distanceSq(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

/** Player foot position used for tree / station proximity. */
export function liveGamePlayerInteractPoint(playerX: number, playerY: number) {
  return {
    x: playerX + EXPLORE_SCENE_PLAYER_W / 2,
    y: playerY + EXPLORE_SCENE_PLAYER_H,
  };
}

export function findNearestInteractable<T extends InteractablePoint>(
  playerX: number,
  playerY: number,
  targets: readonly T[],
  defaultRadius = 64,
): T | null {
  const point = liveGamePlayerInteractPoint(playerX, playerY);
  let best: T | null = null;
  let bestDistSq = Infinity;

  for (const target of targets) {
    const radius = target.interactRadius ?? defaultRadius;
    const distSq = distanceSq(point.x, point.y, target.x, target.y);
    if (distSq > radius * radius) continue;
    if (distSq < bestDistSq) {
      bestDistSq = distSq;
      best = target;
    }
  }

  return best;
}
