import type { WkeTerrainTileId } from "@/lib/topdown/wke-sprite-atlas";

const TERRAIN_TILE_TITLES: Partial<Record<WkeTerrainTileId, string>> = {
  wke_grass_plain: "Grass plain",
  wke_grass_flowers: "Grass flowers",
  wke_grass_edge: "Grass edge",
  wke_grass_corner: "Grass corner",
  wke_grass_plain_2: "Grass plain 2",
  wke_grass_flowers_2: "Grass flowers 2",
  wke_grass_edge_2: "Grass edge 2",
  wke_grass_corner_2: "Grass corner 2",
  wke_sand_plain: "Sand plain",
  wke_sand_shell: "Sand shell",
  wke_sand_cactus: "Sand cactus",
  wke_sand_water_edge: "Sand water edge",
  wke_snow_plain: "Snow plain",
  wke_snow_tree: "Snow tree",
  wke_snow_edge: "Snow edge",
  wke_snow_corner: "Snow corner",
  wke_water_1: "Water 1",
  wke_water_2: "Water 2",
  wke_water_3: "Water 3",
  wke_water_4: "Water 4",
  wke_stone_light: "Stone light",
  wke_stone_grass_crack: "Stone grass crack",
  wke_stone_dark: "Stone dark",
  wke_stone_moss: "Stone moss",
};

export function terrainTileLabel(tileId: WkeTerrainTileId): { title: string; subtitle: string } {
  const title =
    TERRAIN_TILE_TITLES[tileId] ??
    tileId
      .replace(/^wke_/, "")
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  const family = tileId.replace(/^wke_([^_]+).*/, "$1");
  return {
    title,
    subtitle: `${family.charAt(0).toUpperCase()}${family.slice(1)} terrain`,
  };
}
