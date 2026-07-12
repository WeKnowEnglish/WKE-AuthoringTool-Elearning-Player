import {
  ENGLISH_CRAFT_MAP_PIXELS,
  ENGLISH_CRAFT_RIVER_CELL_BOUNDS,
  ENGLISH_CRAFT_RIVER_OVERLAY,
  ENGLISH_CRAFT_TILEMAP_V1,
  isPerimeterWaterCell,
} from "@/lib/live-game/modes/english-craft/tilemap-v1";
import {
  GRASS_TILE_SIZE_PX,
  grassTileColCenterPx,
  grassTileColLeftPx,
  grassTileRowTopPx,
} from "@/lib/live-game/tiles/grass-tile-pack";
import type { LiveGameMapDef } from "@/lib/live-game/modes/types";
import type { Rect } from "@/lib/teststartpage/chase-game-physics";

const MAP_W = ENGLISH_CRAFT_MAP_PIXELS.width;
const MAP_H = ENGLISH_CRAFT_MAP_PIXELS.height;
const MAP_COLS = ENGLISH_CRAFT_TILEMAP_V1.cols;
const MAP_ROWS = ENGLISH_CRAFT_TILEMAP_V1.rows;

function buildRiverCellCollisionRects(): Rect[] {
  const rects: Rect[] = [];
  const { rowStart, rowEnd, colStart, colEnd } = ENGLISH_CRAFT_RIVER_CELL_BOUNDS;

  for (let row = rowStart; row <= rowEnd; row += 1) {
    for (let col = colStart; col <= colEnd; col += 1) {
      rects.push({
        x: grassTileColLeftPx(col),
        y: grassTileRowTopPx(row),
        w: GRASS_TILE_SIZE_PX,
        h: GRASS_TILE_SIZE_PX,
      });
    }
  }

  return rects;
}

function buildPerimeterWaterCollisionRects(): Rect[] {
  const rects: Rect[] = [];
  for (let row = 0; row < MAP_ROWS; row += 1) {
    for (let col = 0; col < MAP_COLS; col += 1) {
      if (!isPerimeterWaterCell(col, row)) continue;
      rects.push({
        x: grassTileColLeftPx(col),
        y: grassTileRowTopPx(row),
        w: GRASS_TILE_SIZE_PX,
        h: GRASS_TILE_SIZE_PX,
      });
    }
  }
  return rects;
}

const RIVER_CELL_COLLISION_RECTS = buildRiverCellCollisionRects();

export const ENGLISH_CRAFT_RIVER_COLLISION_RECTS = RIVER_CELL_COLLISION_RECTS;
export const ENGLISH_CRAFT_RIVER_COLLISION_RECT_COUNT = RIVER_CELL_COLLISION_RECTS.length;

export const ENGLISH_CRAFT_PERIMETER_WATER_COLLISION_RECTS = buildPerimeterWaterCollisionRects();
export const ENGLISH_CRAFT_PERIMETER_WATER_COLLISION_RECT_COUNT =
  ENGLISH_CRAFT_PERIMETER_WATER_COLLISION_RECTS.length;

const COLLISION_RECTS: Rect[] = [
  ...ENGLISH_CRAFT_PERIMETER_WATER_COLLISION_RECTS,
  ...RIVER_CELL_COLLISION_RECTS,
];

const SOUTH_SPAWN_ROW = 9;
const SOUTH_SPAWN_Y = grassTileRowTopPx(SOUTH_SPAWN_ROW) + GRASS_TILE_SIZE_PX * 0.2;
const SPAWN_COLS = [2, 4, 6, 8, 10, 12];

/** South beach spawns; north is objective area (Phase 2). */
export const ENGLISH_CRAFT_MAP_V1: LiveGameMapDef = {
  id: "english-craft-v1",
  modeId: "english_craft",
  widthPx: MAP_W,
  heightPx: MAP_H,
  tilemap: ENGLISH_CRAFT_TILEMAP_V1,
  collisionRects: COLLISION_RECTS,
  spawnPoints: SPAWN_COLS.map((col, index) => ({
    id: `spawn-${index + 1}`,
    x: grassTileColCenterPx(col),
    y: SOUTH_SPAWN_Y,
  })),
};

/** River tiles stay blocked — the internal river is a permanent obstacle. */
export function getEnglishCraftCollisionRects(): Rect[] {
  return COLLISION_RECTS;
}

export { ENGLISH_CRAFT_RIVER_OVERLAY };
