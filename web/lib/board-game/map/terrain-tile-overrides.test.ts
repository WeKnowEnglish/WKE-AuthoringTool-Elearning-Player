import { describe, expect, it } from "vitest";
import { getDefaultMapForPathStyle } from "@/lib/board-game/map/default-maps";
import { generateBoardMap, spaceAtPathIndex } from "@/lib/board-game/map/generate-map";
import { cloneMapAsCustom } from "@/lib/board-game/map/library/map-mutations";
import { parseBoardMap, validateBoardMap } from "@/lib/board-game/map/schema";
import {
  clearTerrainTileOverrides,
  countTerrainTileOverrides,
  getTerrainTileOverride,
  listTerrainTileOverrides,
  setTerrainTileOverride,
} from "@/lib/board-game/map/terrain-tile-overrides";
import { buildBoardTilemap } from "@/lib/board-game/render/build-board-tilemap";

describe("terrain-tile-overrides", () => {
  const map = generateBoardMap({
    id: "terrain-override-test",
    title: "Terrain Override Test",
    theme: "jungle",
    layoutTemplate: "snake",
    boardLength: 12,
    random: () => 0.5,
  });

  it("sets and reads overrides by grid key", () => {
    const updated = setTerrainTileOverride(map, 2, 1, "wke_grass_flowers");
    expect(getTerrainTileOverride(updated, 2, 1)).toBe("wke_grass_flowers");
    expect(updated.terrainTileOverrides?.["2,1"]).toBe("wke_grass_flowers");
  });

  it("clears a single override with null", () => {
    const withOverride = setTerrainTileOverride(map, 1, 0, "wke_grass_plain_2");
    const cleared = setTerrainTileOverride(withOverride, 1, 0, null);
    expect(getTerrainTileOverride(cleared, 1, 0)).toBeUndefined();
    expect(cleared.terrainTileOverrides).toBeUndefined();
  });

  it("clearTerrainTileOverrides removes all overrides", () => {
    let next = setTerrainTileOverride(map, 0, 0, "wke_grass_plain");
    next = setTerrainTileOverride(next, 3, 2, "wke_grass_corner");
    const cleared = clearTerrainTileOverrides(next);
    expect(cleared.terrainTileOverrides).toBeUndefined();
  });

  it("cloneMapAsCustom preserves terrain overrides", () => {
    const withOverride = setTerrainTileOverride(map, 4, 1, "wke_grass_edge");
    const clone = cloneMapAsCustom(withOverride, "Clone");
    expect(clone.terrainTileOverrides).toEqual({ "4,1": "wke_grass_edge" });
  });

  it("lists overrides sorted by path index with autotile hints", () => {
    const space = spaceAtPathIndex(map, 7);
    expect(space).toBeDefined();
    const { col, row } = space!.grid;
    const autotile = buildBoardTilemap(map).terrain[row]?.[col];

    const withOverride = setTerrainTileOverride(map, col, row, "wke_grass_flowers_2");
    const listed = listTerrainTileOverrides(withOverride);

    expect(listed).toHaveLength(1);
    expect(listed[0]).toMatchObject({
      col,
      row,
      tileId: "wke_grass_flowers_2",
      autotileId: autotile,
      pathIndex: 7,
      spaceId: space!.id,
    });
    expect(countTerrainTileOverrides(withOverride)).toBe(1);
    expect(countTerrainTileOverrides(map)).toBe(0);
  });
});

describe("terrain-tile-overrides schema", () => {
  it("round-trips maps with terrainTileOverrides", () => {
    const map = getDefaultMapForPathStyle("short");
    const withOverrides = {
      ...map,
      terrainTileOverrides: {
        "1,0": "wke_grass_plain",
        "2,0": "wke_grass_flowers",
      },
    };
    expect(validateBoardMap(withOverrides)).not.toBeNull();
    const parsed = parseBoardMap(withOverrides);
    expect(parsed.terrainTileOverrides).toEqual(withOverrides.terrainTileOverrides);
  });

  it("rejects invalid terrain tile ids", () => {
    const map = {
      ...getDefaultMapForPathStyle("short"),
      terrainTileOverrides: { "0,0": "wke_not_real" },
    };
    expect(validateBoardMap(map)).toBeNull();
  });
});

describe("buildBoardTilemap terrain overrides", () => {
  const map = generateBoardMap({
    id: "tilemap-terrain-override",
    title: "Tilemap Terrain Override",
    theme: "jungle",
    layoutTemplate: "snake",
    boardLength: 12,
    random: () => 0.5,
  });

  it("uses manual terrain override instead of autotile", () => {
    const space = spaceAtPathIndex(map, 3);
    expect(space).toBeDefined();
    const { col, row } = space!.grid;
    const autotile = buildBoardTilemap(map).terrain[row]?.[col];

    const withOverride = setTerrainTileOverride(map, col, row, "wke_grass_corner");
    const tilemap = buildBoardTilemap(withOverride);
    expect(tilemap.terrain[row]?.[col]).toBe("wke_grass_corner");
    expect(autotile).not.toBe("wke_grass_corner");
  });
});
