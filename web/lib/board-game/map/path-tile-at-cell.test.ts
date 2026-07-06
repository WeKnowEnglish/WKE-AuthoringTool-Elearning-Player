import { describe, expect, it } from "vitest";
import { generateBoardMap, spaceAtPathIndex } from "@/lib/board-game/map/generate-map";
import {
  pathTileAtCell,
  pathTileAtSpace,
  pathTileAtSpaceId,
} from "@/lib/board-game/map/path-tile-at-cell";
import { setPathTileOverride } from "@/lib/board-game/map/path-tile-overrides";
import { buildPathIndexGrid } from "@/lib/board-game/render/path-index-grid";
import { pathAutotileAt } from "@/lib/topdown/path-autotile";

describe("path-tile-at-cell", () => {
  const map = generateBoardMap({
    id: "at-cell-test",
    title: "At Cell Test",
    theme: "jungle",
    layoutTemplate: "snake",
    boardLength: 12,
    random: () => 0.5,
  });

  it("returns null for off-path grid cells", () => {
    const pathGrid = buildPathIndexGrid(map);
    let offPath: { col: number; row: number } | null = null;

    for (let row = 0; row < pathGrid.rows; row++) {
      for (let col = 0; col < pathGrid.cols; col++) {
        if (!pathGrid.pathCells.has(`${col},${row}`)) {
          offPath = { col, row };
          break;
        }
      }
      if (offPath) break;
    }

    expect(offPath).not.toBeNull();
    expect(pathTileAtCell(map, offPath!.col, offPath!.row)).toBeNull();
  });

  it("reports autotile when no override exists", () => {
    const space = spaceAtPathIndex(map, 4);
    expect(space).toBeDefined();

    const { col, row } = space!.grid;
    const pathGrid = buildPathIndexGrid(map);
    const autotile = pathAutotileAt(col, row, pathGrid.pathCells);
    const result = pathTileAtCell(map, col, row);

    expect(result).toEqual({
      effective: autotile,
      autotile,
      override: undefined,
      isManual: false,
    });
  });

  it("prefers override for effective tile", () => {
    const space = spaceAtPathIndex(map, 6);
    expect(space).toBeDefined();

    const { col, row } = space!.grid;
    const withOverride = setPathTileOverride(map, col, row, "path_r2c1");
    const pathGrid = buildPathIndexGrid(withOverride);
    const autotile = pathAutotileAt(col, row, pathGrid.pathCells);

    expect(pathTileAtCell(withOverride, col, row)).toEqual({
      effective: "path_r2c1",
      autotile,
      override: "path_r2c1",
      isManual: true,
    });
  });

  it("resolves by space and space id", () => {
    const space = spaceAtPathIndex(map, 2);
    expect(space).toBeDefined();

    const bySpace = pathTileAtSpace(map, space!);
    const byId = pathTileAtSpaceId(map, space!.id);
    expect(byId).toEqual(bySpace);
    expect(bySpace?.effective).toBeDefined();
  });

  it("returns null for unknown space id", () => {
    expect(pathTileAtSpaceId(map, 99999)).toBeNull();
  });
});
