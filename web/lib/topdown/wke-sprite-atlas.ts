import type { SpriteAtlasConfig, SpriteRect } from "@/lib/topdown/types";

/** Column/row origins for the 4×4 path autotile grid (300×300 cells). */
export const WKE_PATH_COLS = [12, 330, 648, 942] as const;
export const WKE_PATH_ROWS = [12, 330, 648, 942] as const;
export const WKE_PATH_CELL = { sw: 300, sh: 300 } as const;

export function wkePathAutodetectedBounds(row: number, col: number): SpriteRect {
  const sx = WKE_PATH_COLS[col] ?? WKE_PATH_COLS[0];
  const sy = WKE_PATH_ROWS[row] ?? WKE_PATH_ROWS[0];
  return { sx, sy, sw: WKE_PATH_CELL.sw, sh: WKE_PATH_CELL.sh };
}

/**
 * WKE omnidirectional dirt-on-grass path sheet (4×4 autotile set).
 * Tune sx/sy/sw/sh per tile in this file.
 */
export const WKE_PATH_SPRITE_ATLAS = {
  imageSrc: "/assets/wke/dirt-on-grass-path.png",
  width: 1254,
  height: 1254,
  assets: {
    path_r0c0: wkePathAutodetectedBounds(0, 0),
    path_r0c1: wkePathAutodetectedBounds(0, 1),
    path_r0c2: wkePathAutodetectedBounds(0, 2),
    path_r0c3: wkePathAutodetectedBounds(0, 3),
    path_r1c0: wkePathAutodetectedBounds(1, 0),
    path_r1c1: wkePathAutodetectedBounds(1, 1),
    path_r1c2: wkePathAutodetectedBounds(1, 2),
    path_r1c3: wkePathAutodetectedBounds(1, 3),
    path_r2c0: wkePathAutodetectedBounds(2, 0),
    path_r2c1: wkePathAutodetectedBounds(2, 1),
    path_r2c2: wkePathAutodetectedBounds(2, 2),
    path_r2c3: wkePathAutodetectedBounds(2, 3),
    path_r3c0: wkePathAutodetectedBounds(3, 0),
    path_r3c1: wkePathAutodetectedBounds(3, 1),
    path_r3c2: wkePathAutodetectedBounds(3, 2),
    path_r3c3: wkePathAutodetectedBounds(3, 3),
  },
} as const satisfies SpriteAtlasConfig;

export type WkePathTileId = keyof typeof WKE_PATH_SPRITE_ATLAS.assets;

/** Column geometry from autodetected grass row (cols 0–3). */
export const WKE_TERRAIN_COLS = [
  { sx: 14, sw: 100 },
  { sx: 126, sw: 99 },
  { sx: 237, sw: 99 },
  { sx: 348, sw: 102 },
] as const;

export const WKE_TERRAIN_ROW_PITCH = 115;

/** Default autodetected crop for grid row/col — tuned grass tiles override below. */
export function wkeTerrainAutodetectedBounds(row: number, col: number): SpriteRect {
  const column = WKE_TERRAIN_COLS[col] ?? WKE_TERRAIN_COLS[0];
  const sy = row === 0 && col === 2 ? 15 : 14 + row * WKE_TERRAIN_ROW_PITCH;
  const sh = row === 1 && col === 0 ? 105 : 104;
  return { sx: column.sx, sy, sw: column.sw, sh };
}

/** WKE example environment sheet — left 4×6 terrain grid (autodetected crops). */
export const WKE_TERRAIN_SPRITE_ATLAS = {
  imageSrc: "/assets/wke/example-terrain-sheet.png",
  width: 1536,
  height: 1024,
  assets: {
    // Row 0 — grass (hand-tuned autodetect)
    wke_grass_plain: { sx: 14, sy: 14, sw: 100, sh: 104 },
    wke_grass_flowers: { sx: 126, sy: 14, sw: 99, sh: 104 },
    wke_grass_edge: { sx: 237, sy: 15, sw: 99, sh: 104 },
    wke_grass_corner: { sx: 348, sy: 14, sw: 102, sh: 104 },
    // Row 1 — grass variants
    wke_grass_plain_2: { sx: 14, sy: 129, sw: 100, sh: 105 },
    wke_grass_flowers_2: wkeTerrainAutodetectedBounds(1, 1),
    wke_grass_edge_2: wkeTerrainAutodetectedBounds(1, 2),
    wke_grass_corner_2: wkeTerrainAutodetectedBounds(1, 3),
    // Row 2 — sand
    wke_sand_plain: wkeTerrainAutodetectedBounds(2, 0),
    wke_sand_shell: wkeTerrainAutodetectedBounds(2, 1),
    wke_sand_cactus: wkeTerrainAutodetectedBounds(2, 2),
    wke_sand_water_edge: wkeTerrainAutodetectedBounds(2, 3),
    // Row 3 — snow
    wke_snow_plain: wkeTerrainAutodetectedBounds(3, 0),
    wke_snow_tree: wkeTerrainAutodetectedBounds(3, 1),
    wke_snow_edge: wkeTerrainAutodetectedBounds(3, 2),
    wke_snow_corner: wkeTerrainAutodetectedBounds(3, 3),
    // Row 4 — water
    wke_water_1: wkeTerrainAutodetectedBounds(4, 0),
    wke_water_2: wkeTerrainAutodetectedBounds(4, 1),
    wke_water_3: wkeTerrainAutodetectedBounds(4, 2),
    wke_water_4: wkeTerrainAutodetectedBounds(4, 3),
    // Row 5 — stone
    wke_stone_light: wkeTerrainAutodetectedBounds(5, 0),
    wke_stone_grass_crack: wkeTerrainAutodetectedBounds(5, 1),
    wke_stone_dark: wkeTerrainAutodetectedBounds(5, 2),
    wke_stone_moss: wkeTerrainAutodetectedBounds(5, 3),
  },
} as const satisfies SpriteAtlasConfig;

export type WkeTerrainTileId = keyof typeof WKE_TERRAIN_SPRITE_ATLAS.assets;

export const WKE_SPRITE_ATLASES = {
  path: WKE_PATH_SPRITE_ATLAS,
  terrain: WKE_TERRAIN_SPRITE_ATLAS,
} as const;
