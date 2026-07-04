import type { SpriteAtlasConfig } from "@/lib/topdown/types";

/**
 * WKE terrain — omnidirectional dirt-on-grass path sheet (4×4 autotile set).
 * Tune sx/sy/sw/sh per tile in this file.
 */
export const WKE_PATH_SPRITE_ATLAS = {
  imageSrc: "/assets/wke/dirt-on-grass-path.png",
  width: 1254,
  height: 1254,
  assets: {
    path_r0c0: { sx: 12, sy: 12, sw: 300, sh: 300 },
    path_r0c1: { sx: 330, sy: 12, sw: 300, sh: 300 },
    path_r0c2: { sx: 648, sy: 12, sw: 300, sh: 300 },
    path_r0c3: { sx: 942, sy: 12, sw: 300, sh: 300 },
    path_r1c0: { sx: 12, sy: 330, sw: 300, sh: 300 },
    path_r1c1: { sx: 330, sy: 330, sw: 300, sh: 300 },
    path_r1c2: { sx: 648, sy: 330, sw: 300, sh: 300 },
    path_r1c3: { sx: 942, sy: 330, sw: 300, sh: 300 },
    path_r2c0: { sx: 12, sy: 648, sw: 300, sh: 300 },
    path_r2c1: { sx: 330, sy: 648, sw: 300, sh: 300 },
    path_r2c2: { sx: 648, sy: 648, sw: 300, sh: 300 },
    path_r2c3: { sx: 942, sy: 648, sw: 300, sh: 300 },
    path_r3c0: { sx: 12, sy: 942, sw: 300, sh: 300 },
    path_r3c1: { sx: 330, sy: 942, sw: 300, sh: 300 },
    path_r3c2: { sx: 648, sy: 942, sw: 300, sh: 300 },
    path_r3c3: { sx: 942, sy: 942, sw: 300, sh: 300 },
  },
} as const satisfies SpriteAtlasConfig;

export type WkePathTileId = keyof typeof WKE_PATH_SPRITE_ATLAS.assets;

/** WKE example environment sheet — left 4×8 terrain grid tiles. */
export const WKE_TERRAIN_SPRITE_ATLAS = {
  imageSrc: "/assets/wke/example-terrain-sheet.png",
  width: 1536,
  height: 1024,
  assets: {
    wke_grass_plain: { sx: 20, sy: 20, sw: 88, sh: 88 },
    wke_grass_flowers: { sx: 116, sy: 20, sw: 88, sh: 88 },
    wke_grass_edge: { sx: 212, sy: 20, sw: 88, sh: 88 },
    wke_grass_corner: { sx: 308, sy: 20, sw: 88, sh: 88 },
    wke_grass_plain_2: { sx: 20, sy: 116, sw: 88, sh: 88 },
    wke_grass_flowers_2: { sx: 116, sy: 116, sw: 88, sh: 88 },
    wke_grass_edge_2: { sx: 212, sy: 116, sw: 88, sh: 88 },
    wke_grass_corner_2: { sx: 308, sy: 116, sw: 88, sh: 88 },
    wke_sand_plain: { sx: 20, sy: 212, sw: 88, sh: 88 },
    wke_sand_shell: { sx: 116, sy: 212, sw: 88, sh: 88 },
    wke_sand_cactus: { sx: 212, sy: 212, sw: 88, sh: 88 },
    wke_sand_water_edge: { sx: 308, sy: 212, sw: 88, sh: 88 },
    wke_snow_plain: { sx: 20, sy: 308, sw: 88, sh: 88 },
    wke_snow_tree: { sx: 116, sy: 308, sw: 88, sh: 88 },
    wke_snow_edge: { sx: 212, sy: 308, sw: 88, sh: 88 },
    wke_snow_corner: { sx: 308, sy: 308, sw: 88, sh: 88 },
    wke_water_1: { sx: 20, sy: 404, sw: 88, sh: 88 },
    wke_water_2: { sx: 116, sy: 404, sw: 88, sh: 88 },
    wke_water_3: { sx: 212, sy: 404, sw: 88, sh: 88 },
    wke_water_4: { sx: 308, sy: 404, sw: 88, sh: 88 },
    wke_stone_light: { sx: 20, sy: 500, sw: 88, sh: 88 },
    wke_stone_grass_crack: { sx: 116, sy: 500, sw: 88, sh: 88 },
    wke_stone_dark: { sx: 212, sy: 500, sw: 88, sh: 88 },
    wke_stone_moss: { sx: 308, sy: 500, sw: 88, sh: 88 },
  },
} as const satisfies SpriteAtlasConfig;

export type WkeTerrainTileId = keyof typeof WKE_TERRAIN_SPRITE_ATLAS.assets;

export const WKE_SPRITE_ATLASES = {
  path: WKE_PATH_SPRITE_ATLAS,
  terrain: WKE_TERRAIN_SPRITE_ATLAS,
} as const;
