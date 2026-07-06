import type { LetterFruitStageId } from "@/lib/topdown/letter-fruit-atlas";
import { LETTER_FRUIT_STAGE_IDS } from "@/lib/topdown/letter-fruit-atlas";
import type { TileLayoutPreset } from "@/lib/topdown/stacked-individual-layout";

/**
 * Shared grid layout for the pilot map preview.
 * Per-tile footprints still come from each tile preset; strides are shared
 * so mixed grass/dirt rows line up.
 */
export const PILOT_MAP_LAYOUT: TileLayoutPreset = {
  logicalTilePx: 64,
  lipOverlapPx: 5,
  columnOverlapPx: 1,
};

/** Tile ids from individual-tiles / tile-presets. */
export type PilotMapTileId = "grass_1" | "dirt_1" | "dirt_tilled";

/** Letter fruit stages composited on tilled plots (replaces legacy soil lifecycle tiles). */
export const LETTER_FRUIT_PLOT_STAGES = LETTER_FRUIT_STAGE_IDS;

export type LetterFruitPlotStageId = LetterFruitStageId;

export type PilotGardenMapDef = {
  id: string;
  title: string;
  description: string;
  tiles: PilotMapTileId[][];
  /** Letter A fruit overlay per cell — same shape as `tiles`. */
  fruitStages?: (LetterFruitStageId | null)[][];
};

const G = "grass_1" as const;
const T = "dirt_tilled" as const;

/**
 * Sample garden maps for the individual-tile pilot.
 * Rows top → bottom, columns left → right.
 * Growth art is letter-fruit layers on `dirt_tilled`, not legacy soil stage tiles.
 */
export const PILOT_GARDEN_MAPS: PilotGardenMapDef[] = [
  {
    id: "growth-strip",
    title: "Growth stage strip",
    description:
      "Letter A fruit on tilled soil — seed through ripe — on a grass border.",
    tiles: [
      [G, G, G, G, G, G, G, G, G, G],
      [G, T, T, T, T, T, T, G, G, G],
      [G, G, G, G, G, G, G, G, G, G],
    ],
    fruitStages: [
      [null, null, null, null, null, null, null, null, null, null],
      [null, null, "seed", "sprout", "young", "growing", "ripe", null, null, null],
      [null, null, null, null, null, null, null, null, null, null],
    ],
  },
  {
    id: "garden-patch",
    title: "4×4 garden patch",
    description:
      "A small working garden — tilled plots with mixed Letter A growth stages.",
    tiles: [
      [G, G, G, G, G, G, G, G],
      [G, T, T, T, T, T, T, G],
      [G, T, T, T, T, T, T, G],
      [G, T, T, T, T, T, T, G],
      [G, G, G, G, G, G, G, G],
    ],
    fruitStages: [
      [null, null, null, null, null, null, null, null],
      [null, null, "seed", "sprout", "young", "growing", "ripe", null],
      [null, null, "young", "growing", "ripe", "seed", "sprout", null],
      [null, null, "sprout", "young", "growing", "seed", "ripe", null],
      [null, null, null, null, null, null, null, null],
    ],
  },
  {
    id: "yard-path",
    title: "Yard with path & beds",
    description:
      "Grass yard, dirt path, and tilled beds with letter fruit along the walk.",
    tiles: [
      [G, G, G, G, G, G, G, G],
      [G, "dirt_1", "dirt_1", T, T, G, G, G],
      [G, "dirt_1", T, T, T, T, G, G],
      [G, "dirt_1", T, T, T, T, G, G],
      [G, "dirt_1", "dirt_1", "dirt_1", "dirt_1", G, G, G],
      [G, G, G, G, G, G, G, G],
    ],
    fruitStages: [
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, "seed", null, null, null],
      [null, null, null, "sprout", "young", "growing", null, null],
      [null, null, null, "young", "growing", "ripe", null, null],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
    ],
  },
];

/** @deprecated Use PILOT_GARDEN_MAPS[2] — kept for quick imports. */
export const PILOT_MAP_TILES: PilotMapTileId[][] = PILOT_GARDEN_MAPS[2]!.tiles;
