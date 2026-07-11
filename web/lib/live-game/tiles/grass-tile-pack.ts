/** Grass tile pack — assets in /public/assets/tiles/Grass_Tile_Pack/ */

export const GRASS_TILE_SIZE_PX = 80;

/** Earth/dirt color visible in gaps between stacked grass tiles. */
export const LIVE_GAME_GROUND_COLOR = "#2d1a12";

/** Native sprite size (most tiles in the pack). */
export const GRASS_TILE_NATIVE_PX = { w: 197, h: 174 } as const;

/**
 * Brown "lip" band at the bottom of each sprite (image pixels).
 * Tuned so stacked rows overlap cleanly at GRASS_TILE_SIZE_PX.
 */
export const GRASS_TILE_LIP_NATIVE_PX = 38;

export const GRASS_TILE_FOOTPRINT = {
  x: 0,
  y: 0,
  w: GRASS_TILE_NATIVE_PX.w,
  h: GRASS_TILE_NATIVE_PX.h - GRASS_TILE_LIP_NATIVE_PX,
} as const;

export const GRASS_TILE_STACK_LAYOUT = {
  logicalTilePx: GRASS_TILE_SIZE_PX,
  lipOverlapPx: Math.round(
    (GRASS_TILE_LIP_NATIVE_PX * GRASS_TILE_SIZE_PX) / GRASS_TILE_NATIVE_PX.w,
  ),
  columnOverlapPx: 0,
} as const;

export function grassTileRowStridePx(): number {
  return Math.max(1, GRASS_TILE_STACK_LAYOUT.logicalTilePx - GRASS_TILE_STACK_LAYOUT.lipOverlapPx);
}

export function grassTilemapWidthPx(cols: number): number {
  return cols * GRASS_TILE_SIZE_PX;
}

/** Stacked visual height — southern rows overlap northern lips. */
export function grassTilemapHeightPx(rows: number): number {
  if (rows <= 0) return 0;
  return (rows - 1) * grassTileRowStridePx() + GRASS_TILE_SIZE_PX;
}

export function grassTileColLeftPx(col: number): number {
  return col * GRASS_TILE_SIZE_PX;
}

export function grassTileColCenterPx(col: number): number {
  return col * GRASS_TILE_SIZE_PX + GRASS_TILE_SIZE_PX / 2;
}

export function grassTileRowTopPx(row: number): number {
  return row * grassTileRowStridePx();
}

export type GrassTileId =
  | "green_grass"
  | "darkgreen_grass"
  | "yellow_grass"
  | "clover_grass"
  | "flowers_grass"
  | "sprite_06"
  | "sprite_07"
  | "sprite_08"
  | "sprite_09"
  | "sprite_10"
  | "sprite_11"
  | "sprite_12"
  | "sprite_13"
  | "sprite_14"
  | "sprite_15"
  | "sprite_16"
  | "sprite_17"
  | "sprite_18"
  | "sprite_19"
  | "sprite_20"
  | "sprite_21"
  | "sprite_22"
  | "sprite_23"
  | "sprite_24"
  | "sprite_25"
  | "sprite_26"
  | "sprite_27"
  | "sprite_28"
  | "sprite_29"
  | "sprite_30"
  | "sprite_31"
  | "sprite_32"
  | "sprite_33"
  | "sprite_34"
  | "sprite_35"
  | "sprite_36";

const PACK_BASE = "/assets/tiles/Grass_Tile_Pack";

export const GRASS_TILE_SRC: Record<GrassTileId, string> = {
  green_grass: `${PACK_BASE}/green_grass.png`,
  darkgreen_grass: `${PACK_BASE}/darkgreen_grass.png`,
  yellow_grass: `${PACK_BASE}/yellow_grass.png`,
  clover_grass: `${PACK_BASE}/clover_grass.png`,
  flowers_grass: `${PACK_BASE}/flowers_grass.png`,
  sprite_06: `${PACK_BASE}/sprite-06.png`,
  sprite_07: `${PACK_BASE}/sprite-07.png`,
  sprite_08: `${PACK_BASE}/sprite-08.png`,
  sprite_09: `${PACK_BASE}/sprite-09.png`,
  sprite_10: `${PACK_BASE}/sprite-10.png`,
  sprite_11: `${PACK_BASE}/sprite-11.png`,
  sprite_12: `${PACK_BASE}/sprite-12.png`,
  sprite_13: `${PACK_BASE}/sprite-13.png`,
  sprite_14: `${PACK_BASE}/sprite-14.png`,
  sprite_15: `${PACK_BASE}/sprite-15.png`,
  sprite_16: `${PACK_BASE}/sprite-16.png`,
  sprite_17: `${PACK_BASE}/sprite-17.png`,
  sprite_18: `${PACK_BASE}/sprite-18.png`,
  sprite_19: `${PACK_BASE}/sprite-19.png`,
  sprite_20: `${PACK_BASE}/sprite-20.png`,
  sprite_21: `${PACK_BASE}/sprite-21.png`,
  sprite_22: `${PACK_BASE}/sprite-22.png`,
  sprite_23: `${PACK_BASE}/sprite-23.png`,
  sprite_24: `${PACK_BASE}/sprite-24.png`,
  sprite_25: `${PACK_BASE}/sprite-25.png`,
  sprite_26: `${PACK_BASE}/sprite-26.png`,
  sprite_27: `${PACK_BASE}/sprite-27.png`,
  sprite_28: `${PACK_BASE}/sprite-28.png`,
  sprite_29: `${PACK_BASE}/sprite-29.png`,
  sprite_30: `${PACK_BASE}/sprite-30.png`,
  sprite_31: `${PACK_BASE}/sprite-31.png`,
  sprite_32: `${PACK_BASE}/sprite-32.png`,
  sprite_33: `${PACK_BASE}/sprite-33.png`,
  sprite_34: `${PACK_BASE}/sprite-34.png`,
  sprite_35: `${PACK_BASE}/sprite-35.png`,
  sprite_36: `${PACK_BASE}/sprite-36.png`,
};

export const GRASS_TILE_BASE_VARIANTS: GrassTileId[] = [
  "green_grass",
  "darkgreen_grass",
  "yellow_grass",
];

export const GRASS_TILE_DECOR_VARIANTS: GrassTileId[] = [
  "clover_grass",
  "flowers_grass",
  "sprite_06",
  "sprite_15",
  "sprite_22",
  "sprite_31",
];
