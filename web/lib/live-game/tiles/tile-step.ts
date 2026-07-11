import {
  EXPLORE_SCENE_PLAYER_H,
  EXPLORE_SCENE_PLAYER_W,
} from "@/lib/explore/explore-scene-engine";
import {
  GRASS_TILE_SIZE_PX,
  grassTileRowStridePx,
} from "@/lib/live-game/tiles/grass-tile-pack";
import type { LiveGameTilemapDef } from "@/lib/live-game/modes/types";

export function grassTileKey(col: number, row: number): string {
  return `${col}-${row}`;
}

export function grassTileAtPlayerFeet(
  cols: number,
  rows: number,
  x: number,
  y: number,
): { col: number; row: number } | null {
  const footX = x + EXPLORE_SCENE_PLAYER_W / 2;
  const footY = y + EXPLORE_SCENE_PLAYER_H;

  const col = Math.floor(footX / GRASS_TILE_SIZE_PX);
  const rowStride = grassTileRowStridePx();
  let row = Math.floor(footY / rowStride);
  if (row >= rows) row = rows - 1;

  if (col < 0 || col >= cols || row < 0) return null;
  return { col, row };
}

export function isGrassTileAt(
  tilemap: LiveGameTilemapDef,
  col: number,
  row: number,
): boolean {
  return Boolean(tilemap.cells[row]?.[col]);
}
