import type { ExploreSceneDefinition } from "@/lib/explore/scenes/types";
import {
  EXPLORE_SCENE_PLAYER_H,
  EXPLORE_SCENE_PLAYER_W,
  tickExploreSceneMovement,
  type ExploreSceneRunState,
} from "@/lib/explore/explore-scene-engine";
import type { LiveGameMapDef } from "@/lib/live-game/modes/types";
import { GRASS_TILE_SIZE_PX } from "@/lib/live-game/tiles/grass-tile-pack";

export type MovementInput = {
  axisX: number;
  axisY: number;
  dtSec: number;
  speedMultiplier?: number;
};

export type MovementState = {
  x: number;
  y: number;
};

function mapToSceneAdapter(map: LiveGameMapDef): ExploreSceneDefinition {
  return {
    id: "home_help_brother",
    areaId: "bedroom",
    title: map.id,
    subtitle: "",
    order: 1,
    intro: { title: "", body_text: "" },
    map: {
      widthPx: map.widthPx,
      heightPx: map.heightPx,
      backgroundUrl: map.backgroundUrl ?? "",
      collisionRects: map.collisionRects,
    },
    zones: [],
    brother: { x: 0, y: 0, zone: "living_room" },
    wordPickups: [],
    materialPickups: [],
    cloze: { sentences: [] },
    ending: { title: "", body_text: "" },
    nextSceneId: null,
  };
}

export function createMovementState(map: LiveGameMapDef, spawnIndex: number): MovementState {
  const spawn = map.spawnPoints[spawnIndex % map.spawnPoints.length] ?? map.spawnPoints[0];
  if (!spawn) {
    return { x: GRASS_TILE_SIZE_PX, y: GRASS_TILE_SIZE_PX };
  }
  return {
    x: spawn.x,
    y: spawn.y - EXPLORE_SCENE_PLAYER_H / 2,
  };
}

export function tickMovement(
  map: LiveGameMapDef,
  state: MovementState,
  input: MovementInput,
): MovementState {
  const scene = mapToSceneAdapter(map);
  const runState: ExploreSceneRunState = {
    playerX: state.x,
    playerY: state.y,
    collectedWordIds: [],
    collectedMaterialIds: [],
    collectedPickupIds: [],
  };
  const effectiveDtSec = input.dtSec * (input.speedMultiplier ?? 1);
  const next = tickExploreSceneMovement(scene, runState, {
    axisX: input.axisX,
    axisY: input.axisY,
    dtSec: effectiveDtSec,
  });
  return { x: next.playerX, y: next.playerY };
}

export function readKeyboardAxes(keys: Set<string>): { axisX: number; axisY: number } {
  let axisX = 0;
  let axisY = 0;
  if (keys.has("ArrowLeft") || keys.has("a") || keys.has("A")) axisX -= 1;
  if (keys.has("ArrowRight") || keys.has("d") || keys.has("D")) axisX += 1;
  if (keys.has("ArrowUp") || keys.has("w") || keys.has("W")) axisY -= 1;
  if (keys.has("ArrowDown") || keys.has("s") || keys.has("S")) axisY += 1;
  return { axisX, axisY };
}

export function directionFromAxes(axisX: number, axisY: number): "up" | "down" | "left" | "right" {
  if (Math.abs(axisX) >= Math.abs(axisY)) {
    return axisX < 0 ? "left" : axisX > 0 ? "right" : "down";
  }
  return axisY < 0 ? "up" : "down";
}

export { EXPLORE_SCENE_PLAYER_H, EXPLORE_SCENE_PLAYER_W };
