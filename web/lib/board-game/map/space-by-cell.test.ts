import { describe, expect, it } from "vitest";
import { generateBoardMap } from "@/lib/board-game/map/generate-map";
import {
  buildSpaceByCellMap,
  cellKey,
  spaceAtGrid,
} from "@/lib/board-game/map/space-by-cell";

describe("space-by-cell", () => {
  const snakeMap = generateBoardMap({
    id: "space-cell-snake",
    title: "Snake",
    theme: "jungle",
    layoutTemplate: "snake",
    boardLength: 12,
    random: () => 0.5,
  });

  it("indexes every path space by grid position", () => {
    const byCell = buildSpaceByCellMap(snakeMap);
    expect(byCell.size).toBe(snakeMap.spaces.length);
    for (const space of snakeMap.spaces) {
      expect(spaceAtGrid(byCell, space.grid.col, space.grid.row)?.id).toBe(space.id);
    }
  });

  it("returns undefined for off-path cells", () => {
    const byCell = buildSpaceByCellMap(snakeMap);
    expect(spaceAtGrid(byCell, 999, 999)).toBeUndefined();
  });

  it("uses last path index when a cell is revisited", () => {
    const spiralMap = generateBoardMap({
      id: "space-cell-spiral",
      title: "Spiral",
      theme: "jungle",
      layoutTemplate: "spiral",
      boardLength: 20,
      random: () => 0.5,
    });
    const byCell = buildSpaceByCellMap(spiralMap);
    const duplicates = new Map<string, number>();

    for (let pathIndex = 0; pathIndex < spiralMap.pathOrder.length; pathIndex++) {
      const space = spiralMap.spaces.find((s) => s.id === spiralMap.pathOrder[pathIndex]);
      if (!space) continue;
      const key = cellKey(space.grid.col, space.grid.row);
      duplicates.set(key, (duplicates.get(key) ?? 0) + 1);
    }

    const shared = [...duplicates.entries()].find(([, count]) => count > 1);
    if (!shared) return;

    const [key] = shared;
    const lastSpaceId = [...spiralMap.pathOrder]
      .reverse()
      .map((id) => spiralMap.spaces.find((space) => space.id === id))
      .find((space) => space && cellKey(space.grid.col, space.grid.row) === key)?.id;

    const [col, row] = key.split(",").map(Number);
    expect(spaceAtGrid(byCell, col!, row!)?.id).toBe(lastSpaceId);
  });
});
