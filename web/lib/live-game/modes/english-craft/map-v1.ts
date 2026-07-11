import {
  ENGLISH_CRAFT_MAP_PIXELS,
  ENGLISH_CRAFT_NORTH_CHOKE_COL,
  ENGLISH_CRAFT_RIVER_OVERLAY,
  ENGLISH_CRAFT_TILEMAP_V1,
} from "@/lib/live-game/modes/english-craft/tilemap-v1";
import {
  GRASS_TILE_SIZE_PX,
  grassTileColLeftPx,
  grassTileColCenterPx,
  grassTileRowTopPx,
} from "@/lib/live-game/tiles/grass-tile-pack";
import type { LiveGameMapDef } from "@/lib/live-game/modes/types";
import type { Rect } from "@/lib/teststartpage/chase-game-physics";

const MAP_W = ENGLISH_CRAFT_MAP_PIXELS.width;
const MAP_H = ENGLISH_CRAFT_MAP_PIXELS.height;
const MAP_BORDER_PX = Math.round(GRASS_TILE_SIZE_PX * 0.5);

const COLLISION_RECTS: Rect[] = [
  { x: 0, y: 0, w: MAP_W, h: MAP_BORDER_PX },
  { x: 0, y: MAP_H - MAP_BORDER_PX, w: MAP_W, h: MAP_BORDER_PX },
  { x: 0, y: 0, w: MAP_BORDER_PX, h: MAP_H },
  { x: MAP_W - MAP_BORDER_PX, y: 0, w: MAP_BORDER_PX, h: MAP_H },
  {
    x: ENGLISH_CRAFT_RIVER_OVERLAY.x,
    y: ENGLISH_CRAFT_RIVER_OVERLAY.y + MAP_BORDER_PX / 2,
    w: ENGLISH_CRAFT_RIVER_OVERLAY.w,
    h: ENGLISH_CRAFT_RIVER_OVERLAY.h - MAP_BORDER_PX,
  },
  {
    x: grassTileColLeftPx(ENGLISH_CRAFT_NORTH_CHOKE_COL),
    y: grassTileRowTopPx(2),
    w: GRASS_TILE_SIZE_PX,
    h: grassTileRowTopPx(7) + GRASS_TILE_SIZE_PX - grassTileRowTopPx(2),
  },
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

export { ENGLISH_CRAFT_RIVER_OVERLAY };
