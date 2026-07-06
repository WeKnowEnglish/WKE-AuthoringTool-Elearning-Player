import { islandGridForPathIndex } from "@/lib/board-game/map/layouts/island";
import { spiralGridForPathIndex } from "@/lib/board-game/map/layouts/spiral";
import { snakeColumnsForLength, snakeGridForPathIndex } from "@/lib/board-game/map/layouts/snake";
import { generateBoardMap, gridBoundsForTemplate } from "@/lib/board-game/map/generate-map";
import type { MapLayoutTemplate, MapThemeId } from "@/lib/board-game/map/types";
import { buildBoardTilemap } from "@/lib/board-game/render/build-board-tilemap";
import {
  spriteForBoardPathTile,
  terrainFamilyForTheme,
} from "@/lib/board-game/render/terrain-tiles";
import { WKE_TERRAIN_SPRITE_ATLAS, type WkeTerrainTileId } from "@/lib/topdown/wke-sprite-atlas";
import type { SeamlessMapPreviewDef } from "@/lib/topdown/preview-seamless-maps";

export { terrainFamilyForTheme, spriteForBoardPathTile };

export const BOARD_GAME_PREVIEW_THEMES: { value: MapThemeId; label: string }[] = [
  { value: "classroom", label: "Classroom" },
  { value: "jungle", label: "Jungle" },
  { value: "ocean", label: "Ocean" },
  { value: "space", label: "Space" },
  { value: "castle", label: "Castle" },
];

export const BOARD_GAME_PREVIEW_LAYOUTS: { value: MapLayoutTemplate; label: string }[] = [
  { value: "snake", label: "Snake path" },
  { value: "spiral", label: "Spiral path" },
  { value: "island", label: "Island path" },
];

export const BOARD_GAME_PREVIEW_LENGTHS = [12, 20] as const;

const FAMILY_TILES = {
  grass: {
    plain: "wke_grass_plain",
    alt: "wke_grass_flowers",
    start: "wke_grass_corner",
    finish: "wke_grass_flowers_2",
    filler: "wke_grass_plain_2",
  },
  sand: {
    plain: "wke_sand_plain",
    alt: "wke_sand_shell",
    start: "wke_sand_cactus",
    finish: "wke_sand_water_edge",
    filler: "wke_sand_plain",
  },
  snow: {
    plain: "wke_snow_plain",
    alt: "wke_snow_tree",
    start: "wke_snow_edge",
    finish: "wke_snow_corner",
    filler: "wke_snow_plain",
  },
  water: {
    plain: "wke_water_1",
    alt: "wke_water_2",
    start: "wke_sand_water_edge",
    finish: "wke_water_4",
    filler: "wke_water_3",
  },
  stone: {
    plain: "wke_stone_light",
    alt: "wke_stone_grass_crack",
    start: "wke_stone_moss",
    finish: "wke_stone_dark",
    filler: "wke_stone_light",
  },
} as const satisfies Record<
  ReturnType<typeof terrainFamilyForTheme>,
  Record<"plain" | "alt" | "start" | "finish" | "filler", WkeTerrainTileId>
>;

function previewMapFromOptions(options: {
  theme: MapThemeId;
  boardLength: number;
  layout: MapLayoutTemplate;
}) {
  return generateBoardMap({
    id: "preview",
    title: "Preview",
    theme: options.theme,
    layoutTemplate: options.layout,
    boardLength: options.boardLength,
    random: () => 0.5,
  });
}

export function buildBoardGamePreviewBoardMap(options: {
  theme: MapThemeId;
  boardLength: number;
  layout: MapLayoutTemplate;
}) {
  return previewMapFromOptions(options);
}

/** Legacy terrain grid: path cells use theme variants, off-path uses filler. */
export function buildBoardGamePreviewTilesLegacy(options: {
  theme: MapThemeId;
  boardLength: number;
  layout: MapLayoutTemplate;
}): string[][] {
  const { theme, boardLength, layout } = options;
  const pathLength = boardLength + 1;
  const { cols, rows } = gridBoundsForTemplate(layout, pathLength);
  const family = FAMILY_TILES[terrainFamilyForTheme(theme)];

  const pathAt = new Map<string, number>();
  for (let pathIndex = 0; pathIndex < pathLength; pathIndex++) {
    let col = 0;
    let row = 0;
    switch (layout) {
      case "spiral":
        ({ col, row } = spiralGridForPathIndex(pathIndex, pathLength));
        break;
      case "island":
        ({ col, row } = islandGridForPathIndex(pathIndex, pathLength));
        break;
      case "snake":
      default:
        ({ col, row } = snakeGridForPathIndex(pathIndex, snakeColumnsForLength(pathLength)));
    }
    pathAt.set(`${col},${row}`, pathIndex);
  }

  const tiles: string[][] = [];
  for (let row = 0; row < rows; row++) {
    const rowTiles: string[] = [];
    for (let col = 0; col < cols; col++) {
      const pathIndex = pathAt.get(`${col},${row}`);
      rowTiles.push(
        pathIndex !== undefined ?
          spriteForBoardPathTile(theme, pathIndex, boardLength)
        : family.filler,
      );
    }
    tiles.push(rowTiles);
  }

  return tiles;
}

/** Pilot terrain preview — unchanged legacy grid until path layer is shown in UI. */
export function buildBoardGamePreviewTiles(options: {
  theme: MapThemeId;
  boardLength: number;
  layout: MapLayoutTemplate;
}): string[][] {
  return buildBoardGamePreviewTilesLegacy(options);
}

export function buildBoardGamePreviewPathTiles(options: {
  theme: MapThemeId;
  boardLength: number;
  layout: MapLayoutTemplate;
}): (string | null)[][] {
  const map = previewMapFromOptions(options);
  return buildBoardTilemap(map).path;
}

export function buildBoardGamePreviewMap(options: {
  theme: MapThemeId;
  boardLength: number;
  layout: MapLayoutTemplate;
}): SeamlessMapPreviewDef {
  const { theme, boardLength, layout } = options;
  const themeLabel = BOARD_GAME_PREVIEW_THEMES.find((t) => t.value === theme)?.label ?? theme;
  const layoutLabel = BOARD_GAME_PREVIEW_LAYOUTS.find((l) => l.value === layout)?.label ?? layout;

  return {
    id: "wke-terrain",
    title: `${themeLabel} · ${boardLength} spaces · ${layoutLabel}`,
    description:
      "Gapless terrain preview on a board-game path layout. Path tiles use theme family variants; off-path cells use filler.",
    atlas: WKE_TERRAIN_SPRITE_ATLAS,
    tiles: buildBoardGamePreviewTiles(options),
    configPath: "lib/topdown/preview-board-game-terrain.ts",
  };
}

export const WKE_TERRAIN_ASSET_GROUPS: {
  label: string;
  assetIds: WkeTerrainTileId[];
}[] = [
  {
    label: "Grass",
    assetIds: [
      "wke_grass_plain",
      "wke_grass_flowers",
      "wke_grass_edge",
      "wke_grass_corner",
      "wke_grass_plain_2",
      "wke_grass_flowers_2",
      "wke_grass_edge_2",
      "wke_grass_corner_2",
    ],
  },
  {
    label: "Sand",
    assetIds: ["wke_sand_plain", "wke_sand_shell", "wke_sand_cactus", "wke_sand_water_edge"],
  },
  {
    label: "Snow",
    assetIds: ["wke_snow_plain", "wke_snow_tree", "wke_snow_edge", "wke_snow_corner"],
  },
  {
    label: "Water",
    assetIds: ["wke_water_1", "wke_water_2", "wke_water_3", "wke_water_4"],
  },
  {
    label: "Stone",
    assetIds: ["wke_stone_light", "wke_stone_grass_crack", "wke_stone_dark", "wke_stone_moss"],
  },
];
