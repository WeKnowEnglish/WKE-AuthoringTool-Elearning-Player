import { islandGridBounds } from "@/lib/board-game/map/layouts/island";
import { spiralGridBounds } from "@/lib/board-game/map/layouts/spiral";
import { snakeColumnsForLength } from "@/lib/board-game/map/layouts/snake";
import { gridForPathIndex } from "@/lib/board-game/map/grid-for-path-index";
import {
  assignSpecialSpaces,
  spaceLabelForPathIndex,
  spaceTypeForPathIndex,
} from "@/lib/board-game/map/special-spaces";
import { finalizeGeneratedMap } from "@/lib/board-game/map/map-enrich";
import type { BoardMap, BoardMapSpace, GenerateMapOptions, MapLayoutTemplate } from "@/lib/board-game/map/types";

export function gridBoundsForMap(map: BoardMap): { cols: number; rows: number } {
  let maxCol = 0;
  let maxRow = 0;
  for (const space of map.spaces) {
    maxCol = Math.max(maxCol, space.grid.col);
    maxRow = Math.max(maxRow, space.grid.row);
  }
  return { cols: maxCol + 1, rows: maxRow + 1 };
}

export function gridBoundsForTemplate(
  template: MapLayoutTemplate,
  pathLength: number,
): { cols: number; rows: number } {
  switch (template) {
    case "spiral":
      return spiralGridBounds(pathLength);
    case "island":
      return islandGridBounds(pathLength);
    case "snake":
    default: {
      const columns = snakeColumnsForLength(pathLength);
      const rows = Math.ceil(pathLength / columns);
      return { cols: columns, rows };
    }
  }
}

/** Generate a complete BoardMap with path order, grid positions, and special squares. */
export function generateBoardMap(options: GenerateMapOptions): BoardMap {
  const {
    id,
    title,
    theme = "classroom",
    layoutTemplate,
    boardLength,
    random = Math.random,
  } = options;

  const pathLength = boardLength + 1;
  const specialByPathIndex = assignSpecialSpaces(pathLength, random);
  const spaces: BoardMapSpace[] = [];
  const pathOrder: number[] = [];

  for (let pathIndex = 0; pathIndex < pathLength; pathIndex++) {
    const spaceId = pathIndex + 1;
    pathOrder.push(spaceId);
    const special = specialByPathIndex.get(pathIndex);
    const baseType = special?.type ?? spaceTypeForPathIndex(pathIndex, boardLength);
    const label = special?.label ?? spaceLabelForPathIndex(pathIndex, boardLength);

    spaces.push({
      id: spaceId,
      label,
      type: baseType,
      grid: gridForPathIndex(layoutTemplate, pathIndex, pathLength),
      icon: special?.icon,
      kind: special?.kind,
      effect: special?.effect,
    });
  }

  // Normalize start/finish kinds
  const start = spaces[0];
  const finish = spaces[spaces.length - 1];
  if (start) {
    start.type = "start";
    start.kind = undefined;
    start.effect = undefined;
    start.icon = undefined;
  }
  if (finish) {
    finish.type = "finish";
    finish.kind = undefined;
    finish.effect = undefined;
  }

  return finalizeGeneratedMap({
    schemaVersion: 1,
    id,
    title,
    theme,
    layoutTemplate,
    pathOrder,
    spaces,
    connections: [],
  });
}

export function pathIndexFromSpaceId(map: BoardMap, spaceId: number): number {
  return map.pathOrder.indexOf(spaceId);
}

export function spaceAtPathIndex(map: BoardMap, pathIndex: number): BoardMapSpace | null {
  const spaceId = map.pathOrder[pathIndex];
  if (spaceId === undefined) return null;
  return map.spaces.find((space) => space.id === spaceId) ?? null;
}

export function spaceById(map: BoardMap, spaceId: number): BoardMapSpace | null {
  return map.spaces.find((space) => space.id === spaceId) ?? null;
}
