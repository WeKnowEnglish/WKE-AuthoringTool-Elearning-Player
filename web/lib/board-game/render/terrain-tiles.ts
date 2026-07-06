import type { MapSpaceKind, MapThemeId, PathTerrainDecoration } from "@/lib/board-game/map/types";
import type { WkeTerrainTileId } from "@/lib/topdown/wke-sprite-atlas";

export type TerrainFamily = "grass" | "sand" | "snow" | "water" | "stone";

export type { PathTerrainDecoration };

export const FAMILY_TILES: Record<
  TerrainFamily,
  {
    plain: WkeTerrainTileId;
    alt: WkeTerrainTileId;
    start: WkeTerrainTileId;
    finish: WkeTerrainTileId;
    filler: WkeTerrainTileId;
  }
> = {
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
};

export function terrainFamilyForTheme(theme: MapThemeId): TerrainFamily {
  switch (theme) {
    case "ocean":
      return "water";
    case "space":
    case "castle":
      return "stone";
    case "jungle":
    case "classroom":
    default:
      return "grass";
  }
}

export function fillerTileForTheme(theme: MapThemeId): WkeTerrainTileId {
  return FAMILY_TILES[terrainFamilyForTheme(theme)].filler;
}

export function spriteForBoardPathTile(
  theme: MapThemeId,
  pathIndex: number,
  boardLength: number,
): WkeTerrainTileId {
  const family = FAMILY_TILES[terrainFamilyForTheme(theme)];

  if (pathIndex === 0) return family.start;
  if (pathIndex === boardLength) return family.finish;
  return pathIndex % 2 === 0 ? family.plain : family.alt;
}

/** Terrain under the path autotile layer for a single path cell. */
export function terrainTileForPathCell(args: {
  theme: MapThemeId;
  pathIndex: number;
  boardLength: number;
  space?: { kind?: MapSpaceKind };
  decoration?: PathTerrainDecoration;
}): WkeTerrainTileId {
  const decoration = args.decoration ?? "endpoints-only";
  const family = FAMILY_TILES[terrainFamilyForTheme(args.theme)];
  const { pathIndex, boardLength } = args;

  if (pathIndex === 0) return family.start;
  if (pathIndex === boardLength) return family.finish;

  if (args.space?.kind && args.space.kind !== "normal") {
    return family.alt;
  }

  if (decoration === "full-legacy") {
    return pathIndex % 2 === 0 ? family.plain : family.alt;
  }

  return fillerTileForTheme(args.theme);
}
