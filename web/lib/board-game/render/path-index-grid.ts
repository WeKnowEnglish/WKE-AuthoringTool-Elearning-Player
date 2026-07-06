import { gridBoundsForMap } from "@/lib/board-game/map/generate-map";
import type { BoardMap } from "@/lib/board-game/map/types";

export type PathIndexGrid = {
  cols: number;
  rows: number;
  pathIndexAt: (number | undefined)[][];
  pathCells: ReadonlySet<string>;
};

function cellKey(col: number, row: number): string {
  return `${col},${row}`;
}

export function buildPathIndexGrid(map: BoardMap): PathIndexGrid {
  const { cols, rows } = gridBoundsForMap(map);
  const pathIndexAt: (number | undefined)[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => undefined),
  );
  const pathCells = new Set<string>();
  const spaceById = new Map(map.spaces.map((space) => [space.id, space]));

  for (let pathIndex = 0; pathIndex < map.pathOrder.length; pathIndex++) {
    const spaceId = map.pathOrder[pathIndex];
    const space = spaceById.get(spaceId);
    if (!space) {
      throw new Error(`buildPathIndexGrid: pathOrder[${pathIndex}] references missing space id ${spaceId}`);
    }

    const { col, row } = space.grid;
    if (col < 0 || row < 0 || col >= cols || row >= rows) {
      throw new Error(
        `buildPathIndexGrid: space ${spaceId} grid (${col}, ${row}) outside bounds ${cols}×${rows}`,
      );
    }

    const key = cellKey(col, row);
    if (pathCells.has(key)) {
      // Spiral/island layouts can revisit a grid cell; last path index wins for overlays.
      pathIndexAt[row]![col] = pathIndex;
      continue;
    }

    pathCells.add(key);
    pathIndexAt[row]![col] = pathIndex;
  }

  return { cols, rows, pathIndexAt, pathCells };
}
