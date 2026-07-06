import type { SpriteCategory } from "@/lib/topdown/types";
import type {
  TileLayoutPreset,
  TileRect,
} from "@/lib/topdown/stacked-individual-layout";
import { DIRT_1_PRESET } from "@/lib/topdown/tile-presets/dirt_1";
import { DIRT_TILLED_PRESET } from "@/lib/topdown/tile-presets/dirt_tilled";
import { GRASS_1_PRESET } from "@/lib/topdown/tile-presets/grass_1";

export type { TileLayoutPreset, TileRect } from "@/lib/topdown/stacked-individual-layout";

export type IndividualTileDef = {
  id: string;
  label: string;
  category: SpriteCategory;
  /** Public URL, e.g. /assets/tiles/grass-1.png */
  imageSrc: string;
  /** Pixel size of the PNG. */
  width: number;
  height: number;
  /** Tight box around opaque art (no transparent padding). Full-PNG coords. */
  content: TileRect;
  /** Walk surface only (excludes 3D lip). Full-PNG coords. */
  footprint: TileRect;
  layout: TileLayoutPreset;
};

export const INDIVIDUAL_TILE_LOGICAL_PX = 64;
export const INDIVIDUAL_TILE_LIP_OVERLAP_PX = 10;
export const INDIVIDUAL_TILE_COLUMN_OVERLAP_PX = 0;

function fromPreset(preset: {
  id: string;
  label: string;
  category: SpriteCategory;
  imageSrc: string;
  width: number;
  height: number;
  content: TileRect;
  footprint: TileRect;
  layout: TileLayoutPreset;
}): IndividualTileDef {
  return {
    id: preset.id,
    label: preset.label,
    category: preset.category,
    imageSrc: preset.imageSrc,
    width: preset.width,
    height: preset.height,
    content: { ...preset.content },
    footprint: { ...preset.footprint },
    layout: { ...preset.layout },
  };
}

/**
 * Standalone tile files — drop PNGs in public/assets/tiles/ and add a preset
 * under tile-presets/, then register it here.
 */
export const INDIVIDUAL_TILES: IndividualTileDef[] = [
  fromPreset(GRASS_1_PRESET),
  fromPreset(DIRT_1_PRESET),
  fromPreset(DIRT_TILLED_PRESET),
];

export const INDIVIDUAL_TILE_BY_ID: Record<string, IndividualTileDef> =
  Object.fromEntries(INDIVIDUAL_TILES.map((t) => [t.id, t]));

export function getIndividualTile(id: string): IndividualTileDef | undefined {
  return INDIVIDUAL_TILE_BY_ID[id];
}

export function presetExportName(tileId: string): string {
  return `${tileId.toUpperCase()}_PRESET`;
}
