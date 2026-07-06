import type { BoardMap, BoardMapSpace } from "@/lib/board-game/map/types";

export type SpaceByCell = Map<string, BoardMapSpace>;

export function cellKey(col: number, row: number): string {
  return `${col},${row}`;
}

/** Last space wins when multiple path spaces share a grid cell (spiral/island). */
export function buildSpaceByCellMap(map: BoardMap): SpaceByCell {
  const byCell: SpaceByCell = new Map();
  const spaceById = new Map(map.spaces.map((space) => [space.id, space]));

  for (let pathIndex = 0; pathIndex < map.pathOrder.length; pathIndex++) {
    const spaceId = map.pathOrder[pathIndex];
    const space = spaceById.get(spaceId);
    if (!space) continue;
    byCell.set(cellKey(space.grid.col, space.grid.row), space);
  }

  return byCell;
}

export function spaceAtGrid(
  byCell: SpaceByCell,
  col: number,
  row: number,
): BoardMapSpace | undefined {
  return byCell.get(cellKey(col, row));
}
