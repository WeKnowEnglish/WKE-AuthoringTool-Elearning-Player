import { describe, expect, it } from "vitest";
import { getDefaultMapForPathStyle } from "@/lib/board-game/map/default-maps";
import { generateBoardMap, spaceAtPathIndex } from "@/lib/board-game/map/generate-map";
import {
  clearPathTileOverrides,
  countPathTileOverrides,
  getPathTileOverride,
  listPathTileOverrides,
  pathTileGridKey,
  setPathTileOverride,
} from "@/lib/board-game/map/path-tile-overrides";
import { parseBoardMap, validateBoardMap } from "@/lib/board-game/map/schema";
import { cloneMapAsCustom } from "@/lib/board-game/map/library/map-mutations";
import { buildBoardTilemap } from "@/lib/board-game/render/build-board-tilemap";
import { pathAutotileAt } from "@/lib/topdown/path-autotile";
import { buildPathIndexGrid } from "@/lib/board-game/render/path-index-grid";

describe("path-tile-overrides", () => {
  const map = generateBoardMap({
    id: "override-test",
    title: "Override Test",
    theme: "jungle",
    layoutTemplate: "snake",
    boardLength: 12,
    random: () => 0.5,
  });

  it("sets and reads overrides by grid key", () => {
    const updated = setPathTileOverride(map, 2, 1, "path_r1c1");
    expect(getPathTileOverride(updated, 2, 1)).toBe("path_r1c1");
    expect(pathTileGridKey(2, 1)).toBe("2,1");
    expect(updated.pathTileOverrides?.["2,1"]).toBe("path_r1c1");
  });

  it("clears a single override with null", () => {
    const withOverride = setPathTileOverride(map, 1, 0, "path_r2c2");
    const cleared = setPathTileOverride(withOverride, 1, 0, null);
    expect(getPathTileOverride(cleared, 1, 0)).toBeUndefined();
    expect(cleared.pathTileOverrides).toBeUndefined();
  });

  it("clearPathTileOverrides removes all overrides", () => {
    let next = setPathTileOverride(map, 0, 0, "path_r0c0");
    next = setPathTileOverride(next, 3, 2, "path_r3c3");
    const cleared = clearPathTileOverrides(next);
    expect(cleared.pathTileOverrides).toBeUndefined();
  });

  it("cloneMapAsCustom preserves overrides", () => {
    const withOverride = setPathTileOverride(map, 4, 1, "path_r1c3");
    const clone = cloneMapAsCustom(withOverride, "Clone");
    expect(clone.pathTileOverrides).toEqual({ "4,1": "path_r1c3" });
  });

  it("lists overrides sorted by path index with autotile hints", () => {
    const space = spaceAtPathIndex(map, 7);
    expect(space).toBeDefined();
    const { col, row } = space!.grid;
    const pathGrid = buildPathIndexGrid(map);
    const autotile = pathAutotileAt(col, row, pathGrid.pathCells);

    const withOverride = setPathTileOverride(map, col, row, "path_r2c1");
    const listed = listPathTileOverrides(withOverride);

    expect(listed).toHaveLength(1);
    expect(listed[0]).toMatchObject({
      col,
      row,
      tileId: "path_r2c1",
      autotileId: autotile,
      pathIndex: 7,
      spaceId: space!.id,
    });
    expect(countPathTileOverrides(withOverride)).toBe(1);
    expect(countPathTileOverrides(map)).toBe(0);
  });
});

describe("path-tile-overrides schema", () => {
  it("round-trips maps with pathTileOverrides", () => {
    const map = getDefaultMapForPathStyle("short");
    const withOverrides = {
      ...map,
      pathTileOverrides: {
        "1,0": "path_r0c1",
        "2,0": "path_r1c1",
      },
    };
    expect(validateBoardMap(withOverrides)).not.toBeNull();
    const parsed = parseBoardMap(withOverrides);
    expect(parsed.pathTileOverrides).toEqual(withOverrides.pathTileOverrides);
  });

  it("rejects invalid path tile ids", () => {
    const map = {
      ...getDefaultMapForPathStyle("short"),
      pathTileOverrides: { "0,0": "path_not_real" },
    };
    expect(validateBoardMap(map)).toBeNull();
  });

  it("accepts maps without pathTileOverrides", () => {
    const map = getDefaultMapForPathStyle("short");
    expect(map.pathTileOverrides).toBeUndefined();
    expect(validateBoardMap(map)).not.toBeNull();
  });
});

describe("buildBoardTilemap path overrides", () => {
  const map = generateBoardMap({
    id: "tilemap-override",
    title: "Tilemap Override",
    theme: "jungle",
    layoutTemplate: "snake",
    boardLength: 12,
    random: () => 0.5,
  });

  it("uses manual override instead of autotile", () => {
    const space = spaceAtPathIndex(map, 3);
    expect(space).toBeDefined();
    const { col, row } = space!.grid;
    const pathGrid = buildPathIndexGrid(map);
    const autotile = pathAutotileAt(col, row, pathGrid.pathCells);

    const withOverride = setPathTileOverride(map, col, row, "path_r3c3");
    const tilemap = buildBoardTilemap(withOverride);
    expect(tilemap.path[row]?.[col]).toBe("path_r3c3");
    expect(autotile).not.toBe("path_r3c3");
  });

  it("restores autotile after override is cleared", () => {
    const space = spaceAtPathIndex(map, 5);
    expect(space).toBeDefined();
    const { col, row } = space!.grid;
    const pathGrid = buildPathIndexGrid(map);
    const autotile = pathAutotileAt(col, row, pathGrid.pathCells);

    const withOverride = setPathTileOverride(map, col, row, "path_r2c1");
    const cleared = setPathTileOverride(withOverride, col, row, null);
    const tilemap = buildBoardTilemap(cleared);
    expect(tilemap.path[row]?.[col]).toBe(autotile);
  });
});
