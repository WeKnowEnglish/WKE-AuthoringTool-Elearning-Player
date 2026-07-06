import type { AtlasTileStackPreset } from "@/lib/topdown/atlas-tile-layout";
import { clampStackPresetToCrop, defaultAtlasTileStackPreset } from "@/lib/topdown/atlas-tile-layout";
import {
  WKE_TERRAIN_SPRITE_ATLAS,
  type WkeTerrainTileId,
} from "@/lib/topdown/wke-sprite-atlas";

export const WKE_TERRAIN_DEFAULT_LAYOUT = {
  logicalTilePx: 64,
  lipOverlapPx: 10,
  columnOverlapPx: 0,
} as const;

type CropKind = "plain" | "prop" | "edge" | "corner";

const LAYOUT_BY_KIND: Record<CropKind, AtlasTileStackPreset["layout"]> = {
  plain: { logicalTilePx: 64, lipOverlapPx: 2, columnOverlapPx: 0 },
  prop: { logicalTilePx: 58, lipOverlapPx: 1, columnOverlapPx: 0 },
  edge: { logicalTilePx: 64, lipOverlapPx: 1, columnOverlapPx: 0 },
  corner: { logicalTilePx: 64, lipOverlapPx: 4, columnOverlapPx: 0 },
};

/** Lip band ~9–10px, inferred from the first five tuned grass tiles. */
export function buildWkeFullCropPreset(
  sw: number,
  sh: number,
  kind: CropKind,
): AtlasTileStackPreset {
  const lipPx = sh >= 105 ? 10 : 9;
  const insetY = kind === "prop" ? 1 : 0;
  const lipStartY = sh - lipPx;
  const walkHeight = lipStartY - insetY;

  return clampStackPresetToCrop(
    {
      walk: { insetX: 0, insetY, width: sw, height: walkHeight },
      lipStartY,
      layout: { ...LAYOUT_BY_KIND[kind] },
    },
    sw,
    sh,
  );
}

function boundsFor(assetId: WkeTerrainTileId) {
  return WKE_TERRAIN_SPRITE_ATLAS.assets[assetId];
}

function presetFromCrop(assetId: WkeTerrainTileId, kind: CropKind): AtlasTileStackPreset {
  const { sw, sh } = boundsFor(assetId);
  return buildWkeFullCropPreset(sw, sh, kind);
}

/** Manually tuned — do not overwrite via batch pass. */
const TUNED_GRASS_PRESETS: Pick<
  Record<WkeTerrainTileId, AtlasTileStackPreset>,
  | "wke_grass_plain"
  | "wke_grass_flowers"
  | "wke_grass_edge"
  | "wke_grass_corner"
  | "wke_grass_plain_2"
> = {
  wke_grass_plain: {
    walk: { insetX: 0, insetY: 0, width: 100, height: 95 },
    lipStartY: 95,
    layout: { logicalTilePx: 58, lipOverlapPx: 2, columnOverlapPx: 0 },
  },
  wke_grass_flowers: {
    walk: { insetX: 0, insetY: 1, width: 99, height: 94 },
    lipStartY: 95,
    layout: { logicalTilePx: 58, lipOverlapPx: 1, columnOverlapPx: 0 },
  },
  wke_grass_edge: {
    walk: { insetX: 0, insetY: 0, width: 99, height: 94 },
    lipStartY: 94,
    layout: { logicalTilePx: 64, lipOverlapPx: 1, columnOverlapPx: 0 },
  },
  wke_grass_corner: {
    walk: { insetX: 0, insetY: 0, width: 102, height: 95 },
    lipStartY: 95,
    layout: { logicalTilePx: 64, lipOverlapPx: 4, columnOverlapPx: 0 },
  },
  wke_grass_plain_2: {
    walk: { insetX: 0, insetY: 0, width: 100, height: 95 },
    lipStartY: 95,
    layout: { logicalTilePx: 64, lipOverlapPx: 2, columnOverlapPx: 0 },
  },
};

export const WKE_TERRAIN_TILE_STACK_PRESETS: Record<WkeTerrainTileId, AtlasTileStackPreset> = {
  ...TUNED_GRASS_PRESETS,
  wke_grass_flowers_2: presetFromCrop("wke_grass_flowers_2", "prop"),
  wke_grass_edge_2: presetFromCrop("wke_grass_edge_2", "edge"),
  wke_grass_corner_2: presetFromCrop("wke_grass_corner_2", "corner"),
  wke_sand_plain: presetFromCrop("wke_sand_plain", "plain"),
  wke_sand_shell: presetFromCrop("wke_sand_shell", "prop"),
  wke_sand_cactus: presetFromCrop("wke_sand_cactus", "prop"),
  wke_sand_water_edge: presetFromCrop("wke_sand_water_edge", "edge"),
  wke_snow_plain: presetFromCrop("wke_snow_plain", "plain"),
  wke_snow_tree: presetFromCrop("wke_snow_tree", "prop"),
  wke_snow_edge: presetFromCrop("wke_snow_edge", "edge"),
  wke_snow_corner: presetFromCrop("wke_snow_corner", "corner"),
  wke_water_1: presetFromCrop("wke_water_1", "plain"),
  wke_water_2: presetFromCrop("wke_water_2", "plain"),
  wke_water_3: presetFromCrop("wke_water_3", "plain"),
  wke_water_4: presetFromCrop("wke_water_4", "plain"),
  wke_stone_light: presetFromCrop("wke_stone_light", "plain"),
  wke_stone_grass_crack: presetFromCrop("wke_stone_grass_crack", "plain"),
  wke_stone_dark: presetFromCrop("wke_stone_dark", "plain"),
  wke_stone_moss: presetFromCrop("wke_stone_moss", "prop"),
};

export function getWkeTerrainStackPreset(
  assetId: string,
  sw: number,
  sh: number,
): AtlasTileStackPreset {
  const preset = WKE_TERRAIN_TILE_STACK_PRESETS[assetId as WkeTerrainTileId];
  if (preset) {
    return clampStackPresetToCrop(
      {
        walk: { ...preset.walk },
        lipStartY: preset.lipStartY,
        layout: { ...preset.layout },
      },
      sw,
      sh,
    );
  }
  return defaultAtlasTileStackPreset(sw, sh);
}

export function listWkeTerrainTileIds(): WkeTerrainTileId[] {
  return Object.keys(WKE_TERRAIN_TILE_STACK_PRESETS) as WkeTerrainTileId[];
}
