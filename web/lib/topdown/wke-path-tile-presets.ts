import type { AtlasTileStackPreset } from "@/lib/topdown/atlas-tile-layout";
import { clampStackPresetToCrop, defaultAtlasTileStackPreset } from "@/lib/topdown/atlas-tile-layout";
import {
  WKE_PATH_SPRITE_ATLAS,
  type WkePathTileId,
} from "@/lib/topdown/wke-sprite-atlas";

export const WKE_PATH_DEFAULT_LAYOUT = {
  logicalTilePx: 64,
  lipOverlapPx: 6,
  columnOverlapPx: 0,
} as const;

/** Full-crop walk + grass lip band scaled for 300×300 path autotiles. */
export function buildWkePathFullCropPreset(sw: number, sh: number): AtlasTileStackPreset {
  const lipPx = Math.max(20, Math.round((sh * 10) / 104));
  const lipStartY = sh - lipPx;
  const walkHeight = lipStartY;

  return clampStackPresetToCrop(
    {
      walk: { insetX: 0, insetY: 0, width: sw, height: walkHeight },
      lipStartY,
      layout: { ...WKE_PATH_DEFAULT_LAYOUT },
    },
    sw,
    sh,
  );
}

function presetFromCrop(assetId: WkePathTileId): AtlasTileStackPreset {
  const { sw, sh } = WKE_PATH_SPRITE_ATLAS.assets[assetId];
  return buildWkePathFullCropPreset(sw, sh);
}

export const WKE_PATH_TILE_STACK_PRESETS: Record<WkePathTileId, AtlasTileStackPreset> = {
  path_r0c0: presetFromCrop("path_r0c0"),
  path_r0c1: presetFromCrop("path_r0c1"),
  path_r0c2: presetFromCrop("path_r0c2"),
  path_r0c3: presetFromCrop("path_r0c3"),
  path_r1c0: presetFromCrop("path_r1c0"),
  path_r1c1: presetFromCrop("path_r1c1"),
  path_r1c2: presetFromCrop("path_r1c2"),
  path_r1c3: presetFromCrop("path_r1c3"),
  path_r2c0: presetFromCrop("path_r2c0"),
  path_r2c1: presetFromCrop("path_r2c1"),
  path_r2c2: presetFromCrop("path_r2c2"),
  path_r2c3: presetFromCrop("path_r2c3"),
  path_r3c0: presetFromCrop("path_r3c0"),
  path_r3c1: presetFromCrop("path_r3c1"),
  path_r3c2: presetFromCrop("path_r3c2"),
  path_r3c3: presetFromCrop("path_r3c3"),
};

export function getWkePathStackPreset(
  assetId: string,
  sw: number,
  sh: number,
): AtlasTileStackPreset {
  const preset = WKE_PATH_TILE_STACK_PRESETS[assetId as WkePathTileId];
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

export function listWkePathTileIds(): WkePathTileId[] {
  return Object.keys(WKE_PATH_TILE_STACK_PRESETS) as WkePathTileId[];
}
