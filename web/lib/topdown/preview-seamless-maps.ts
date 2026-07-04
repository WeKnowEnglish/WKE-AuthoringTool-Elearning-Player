import { GARDEN_SPRITE_ATLAS } from "@/lib/topdown/garden-sprite-atlas";
import {
  WKE_PATH_SPRITE_ATLAS,
  WKE_TERRAIN_SPRITE_ATLAS,
} from "@/lib/topdown/wke-sprite-atlas";
import type { SpriteAtlasConfig } from "@/lib/topdown/types";

export const SEAMLESS_MAP_TILE_PX = 64;

export const GARDEN_SEAMLESS_MAP_TILES: string[][] = [
  ["fence_corner", "fence_horizontal", "fence_horizontal", "fence_horizontal", "fence_horizontal", "fence_horizontal", "fence_horizontal", "fence_corner"],
  ["fence_end", "grass_plain", "grass_flowers", "grass_bush", "grass_plain", "soil_plain", "soil_rocks", "fence_end"],
  ["fence_end", "grass_plain", "plant_sprout", "plant_growing", "plant_ready", "soil_tilled", "soil_rocks", "fence_end"],
  ["fence_end", "grass_flowers", "grass_bush", "grass_plain", "grass_flowers", "soil_plain", "soil_tilled", "fence_end"],
  ["fence_end", "grass_plain", "grass_plain", "grass_plain", "grass_plain", "soil_tilled", "soil_tilled", "fence_end"],
  ["fence_corner", "fence_horizontal", "fence_horizontal", "fence_horizontal", "fence_horizontal", "fence_horizontal", "fence_horizontal", "fence_corner"],
];

export const WKE_PATH_SEAMLESS_MAP_TILES: string[][] = [
  ["path_r0c0", "path_r0c1", "path_r0c1", "path_r0c2", "path_r0c3", "path_r0c3", "path_r0c3", "path_r0c3"],
  ["path_r1c0", "path_r1c1", "path_r1c1", "path_r1c2", "path_r1c2", "path_r1c3", "path_r1c3", "path_r1c3"],
  ["path_r2c0", "path_r2c0", "path_r2c1", "path_r2c2", "path_r2c2", "path_r2c3", "path_r2c3", "path_r2c3"],
  ["path_r3c0", "path_r3c0", "path_r3c1", "path_r3c1", "path_r3c2", "path_r3c2", "path_r3c3", "path_r3c3"],
  ["path_r3c0", "path_r3c0", "path_r2c1", "path_r2c1", "path_r2c2", "path_r2c2", "path_r1c3", "path_r1c3"],
  ["path_r2c0", "path_r2c0", "path_r2c1", "path_r1c1", "path_r1c2", "path_r1c2", "path_r0c3", "path_r0c3"],
];

export const WKE_TERRAIN_SEAMLESS_MAP_TILES: string[][] = [
  ["wke_grass_plain", "wke_grass_plain", "wke_grass_flowers", "wke_grass_flowers", "wke_grass_edge", "wke_grass_corner", "wke_grass_plain_2", "wke_grass_plain_2"],
  ["wke_grass_plain", "wke_grass_flowers", "wke_grass_flowers_2", "wke_grass_plain_2", "wke_sand_plain", "wke_sand_shell", "wke_sand_cactus", "wke_sand_water_edge"],
  ["wke_grass_edge", "wke_grass_plain_2", "wke_stone_light", "wke_stone_grass_crack", "wke_sand_plain", "wke_water_1", "wke_water_2", "wke_water_3"],
  ["wke_grass_corner_2", "wke_grass_edge_2", "wke_stone_dark", "wke_stone_moss", "wke_sand_water_edge", "wke_water_2", "wke_water_3", "wke_water_4"],
  ["wke_snow_plain", "wke_snow_tree", "wke_stone_light", "wke_stone_grass_crack", "wke_sand_plain", "wke_water_1", "wke_water_4", "wke_water_4"],
  ["wke_snow_edge", "wke_snow_corner", "wke_grass_plain", "wke_grass_flowers", "wke_sand_shell", "wke_water_3", "wke_water_4", "wke_water_4"],
];

export type SeamlessMapPreviewDef = {
  id: string;
  title: string;
  description: string;
  atlas: SpriteAtlasConfig;
  tiles: string[][];
  configPath: string;
};

export const SEAMLESS_MAP_PREVIEWS: SeamlessMapPreviewDef[] = [
  {
    id: "garden",
    title: "Custom garden sheet",
    description:
      "Language Garden assets — grass, soil, crops, and fence border.",
    atlas: GARDEN_SPRITE_ATLAS,
    tiles: GARDEN_SEAMLESS_MAP_TILES,
    configPath: "lib/topdown/garden-sprite-atlas.ts",
  },
  {
    id: "wke-path",
    title: "WKE dirt-on-grass path (4×4 autotile)",
    description:
      "Omnidirectional path tiles from dirt-on-grass-path.png — the seamless WKE path set.",
    atlas: WKE_PATH_SPRITE_ATLAS,
    tiles: WKE_PATH_SEAMLESS_MAP_TILES,
    configPath: "lib/topdown/wke-sprite-atlas.ts",
  },
  {
    id: "wke-terrain",
    title: "WKE example terrain grid",
    description:
      "Grass, sand, snow, water, and stone from the example terrain sheet left grid.",
    atlas: WKE_TERRAIN_SPRITE_ATLAS,
    tiles: WKE_TERRAIN_SEAMLESS_MAP_TILES,
    configPath: "lib/topdown/wke-sprite-atlas.ts",
  },
];

export type GardenMapSnippetTileKey =
  | "grass_plain"
  | "grass_flowers"
  | "grass_bush"
  | "soil_plain"
  | "soil_rocks"
  | "soil_tilled"
  | "plant_sprout"
  | "plant_growing"
  | "plant_ready"
  | "fence_end"
  | "fence_horizontal"
  | "fence_corner";

export const MAP_SNIPPET_TILE_TO_FRAME_ID: Record<GardenMapSnippetTileKey, string> = {
  grass_plain: "grass_plain",
  grass_flowers: "grass_flowers",
  grass_bush: "grass_bush",
  soil_plain: "soil_plain",
  soil_rocks: "soil_rocks",
  soil_tilled: "soil_tilled",
  plant_sprout: "plant_sprout",
  plant_growing: "plant_growing",
  plant_ready: "plant_ready",
  fence_end: "fence_end",
  fence_horizontal: "fence_horizontal",
  fence_corner: "fence_corner",
};

export const MOCK_MAP_TILES = GARDEN_SEAMLESS_MAP_TILES;

export const MAP_SNIPPET_LEGEND: { key: GardenMapSnippetTileKey; label: string }[] = [
  { key: "grass_plain", label: "Grass" },
  { key: "soil_tilled", label: "Soil" },
  { key: "plant_ready", label: "Crops" },
  { key: "fence_horizontal", label: "Fence" },
];

export const MAP_SNIPPET_TILE_PX = SEAMLESS_MAP_TILE_PX;
