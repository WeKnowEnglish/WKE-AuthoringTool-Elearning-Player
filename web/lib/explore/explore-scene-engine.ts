import type { ExploreSceneDefinition, ExploreSceneZoneId } from "@/lib/explore/scenes/types";
import { rectsOverlap, type Rect } from "@/lib/teststartpage/chase-game-physics";

export const EXPLORE_SCENE_PLAYER_W = 32;
export const EXPLORE_SCENE_PLAYER_H = 32;
export const EXPLORE_SCENE_MOVE_SPEED_PX_PER_SEC = 200;
export const EXPLORE_SCENE_DEFAULT_INTERACT_RADIUS = 52;

export type ExploreSceneRunState = {
  playerX: number;
  playerY: number;
  collectedWordIds: string[];
  collectedMaterialIds: string[];
  collectedPickupIds: string[];
};

export type ExploreSceneInteractTarget =
  | { kind: "word"; pickupId: string; wordId: string; objectLabel: string }
  | { kind: "material"; pickupId: string; materialId: string; label: string }
  | { kind: "brother" };

export function playerSceneRect(px: number, py: number): Rect {
  return { x: px, y: py, w: EXPLORE_SCENE_PLAYER_W, h: EXPLORE_SCENE_PLAYER_H };
}

export function playerSceneCenter(px: number, py: number): { x: number; y: number } {
  return {
    x: px + EXPLORE_SCENE_PLAYER_W / 2,
    y: py + EXPLORE_SCENE_PLAYER_H / 2,
  };
}

function collidesAny(player: Rect, walls: Rect[]): boolean {
  for (const wall of walls) {
    if (rectsOverlap(player, wall)) return true;
  }
  return false;
}

function clampPlayerToMap(
  px: number,
  py: number,
  mapW: number,
  mapH: number,
): { x: number; y: number } {
  const maxX = Math.max(0, mapW - EXPLORE_SCENE_PLAYER_W);
  const maxY = Math.max(0, mapH - EXPLORE_SCENE_PLAYER_H);
  return {
    x: Math.min(maxX, Math.max(0, px)),
    y: Math.min(maxY, Math.max(0, py)),
  };
}

/** Spawn beside brother with a small offset. */
export function createExploreSceneState(scene: ExploreSceneDefinition): ExploreSceneRunState {
  const spawn = clampPlayerToMap(
    scene.brother.x + 72,
    scene.brother.y + 48,
    scene.map.widthPx,
    scene.map.heightPx,
  );
  return {
    playerX: spawn.x,
    playerY: spawn.y,
    collectedWordIds: [],
    collectedMaterialIds: [],
    collectedPickupIds: [],
  };
}

export function resolveCurrentZone(
  scene: ExploreSceneDefinition,
  playerX: number,
  playerY: number,
): ExploreSceneZoneId | null {
  const center = playerSceneCenter(playerX, playerY);
  for (const zone of scene.zones) {
    const b = zone.bounds;
    if (
      center.x >= b.x &&
      center.x <= b.x + b.w &&
      center.y >= b.y &&
      center.y <= b.y + b.h
    ) {
      return zone.id;
    }
  }
  return scene.zones[0]?.id ?? null;
}

function distanceSq(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

function interactRadius(r?: number): number {
  const rad = r ?? EXPLORE_SCENE_DEFAULT_INTERACT_RADIUS;
  return rad * rad;
}

export function isChecklistComplete(
  scene: ExploreSceneDefinition,
  state: ExploreSceneRunState,
): boolean {
  const wordsDone = scene.wordPickups.every((p) =>
    state.collectedWordIds.includes(p.wordId),
  );
  const materialsDone = scene.materialPickups.every((p) =>
    state.collectedMaterialIds.includes(p.materialId),
  );
  return wordsDone && materialsDone;
}

export function findInteractTarget(
  scene: ExploreSceneDefinition,
  state: ExploreSceneRunState,
  opts?: { allowBrother?: boolean },
): ExploreSceneInteractTarget | null {
  const allowBrother = opts?.allowBrother ?? isChecklistComplete(scene, state);
  const center = playerSceneCenter(state.playerX, state.playerY);
  let bestTarget: ExploreSceneInteractTarget | null = null;
  let bestDistSq = Infinity;

  const consider = (target: ExploreSceneInteractTarget, x: number, y: number, r?: number) => {
    const d = distanceSq(center.x, center.y, x, y);
    if (d > interactRadius(r)) return;
    if (d < bestDistSq) {
      bestDistSq = d;
      bestTarget = target;
    }
  };

  for (const p of scene.wordPickups) {
    if (state.collectedPickupIds.includes(p.pickupId)) continue;
    consider(
      {
        kind: "word",
        pickupId: p.pickupId,
        wordId: p.wordId,
        objectLabel: p.objectLabel,
      },
      p.x,
      p.y,
      p.interactRadius,
    );
  }

  for (const p of scene.materialPickups) {
    if (state.collectedPickupIds.includes(p.pickupId)) continue;
    consider(
      {
        kind: "material",
        pickupId: p.pickupId,
        materialId: p.materialId,
        label: p.label,
      },
      p.x,
      p.y,
      p.interactRadius,
    );
  }

  if (allowBrother) {
    consider({ kind: "brother" }, scene.brother.x, scene.brother.y, scene.brother.interactRadius);
  }

  return bestTarget;
}

export function collectWordPickup(
  state: ExploreSceneRunState,
  pickupId: string,
  wordId: string,
): ExploreSceneRunState {
  if (state.collectedPickupIds.includes(pickupId)) return state;
  return {
    ...state,
    collectedPickupIds: [...state.collectedPickupIds, pickupId],
    collectedWordIds: state.collectedWordIds.includes(wordId)
      ? state.collectedWordIds
      : [...state.collectedWordIds, wordId],
  };
}

export function collectMaterialPickup(
  state: ExploreSceneRunState,
  pickupId: string,
  materialId: string,
): ExploreSceneRunState {
  if (state.collectedPickupIds.includes(pickupId)) return state;
  return {
    ...state,
    collectedPickupIds: [...state.collectedPickupIds, pickupId],
    collectedMaterialIds: state.collectedMaterialIds.includes(materialId)
      ? state.collectedMaterialIds
      : [...state.collectedMaterialIds, materialId],
  };
}

export type ExploreSceneMoveInput = {
  /** -1, 0, or 1 per axis */
  axisX: number;
  axisY: number;
  dtSec: number;
};

export function tickExploreSceneMovement(
  scene: ExploreSceneDefinition,
  state: ExploreSceneRunState,
  input: ExploreSceneMoveInput,
): ExploreSceneRunState {
  const ax = Math.max(-1, Math.min(1, input.axisX));
  const ay = Math.max(-1, Math.min(1, input.axisY));
  if (ax === 0 && ay === 0) return state;

  const len = Math.hypot(ax, ay) || 1;
  const speed = EXPLORE_SCENE_MOVE_SPEED_PX_PER_SEC;
  const dx = (ax / len) * speed * input.dtSec;
  const dy = (ay / len) * speed * input.dtSec;

  const walls = scene.map.collisionRects;
  const { widthPx, heightPx } = scene.map;

  let px = state.playerX;
  let py = state.playerY;

  const tryX = clampPlayerToMap(px + dx, py, widthPx, heightPx);
  if (!collidesAny(playerSceneRect(tryX.x, tryX.y), walls)) {
    px = tryX.x;
  }

  const tryY = clampPlayerToMap(px, py + dy, widthPx, heightPx);
  if (!collidesAny(playerSceneRect(tryY.x, tryY.y), walls)) {
    py = tryY.y;
  }

  return { ...state, playerX: px, playerY: py };
}
