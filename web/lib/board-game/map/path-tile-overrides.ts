import { spaceAtPathIndex } from "@/lib/board-game/map/generate-map";
import type { BoardMap } from "@/lib/board-game/map/types";
import { buildPathIndexGrid } from "@/lib/board-game/render/path-index-grid";
import { pathAutotileAt } from "@/lib/topdown/path-autotile";
import type { WkePathTileId } from "@/lib/topdown/wke-sprite-atlas";

/** Grid cell key for path tile overrides — `"col,row"`. */
export function pathTileGridKey(col: number, row: number): string {
  return `${col},${row}`;
}

export function getPathTileOverride(
  map: BoardMap,
  col: number,
  row: number,
): WkePathTileId | undefined {
  return map.pathTileOverrides?.[pathTileGridKey(col, row)];
}

/** Set a manual path tile on a grid cell, or pass `null` to revert to autotile. */
export function setPathTileOverride(
  map: BoardMap,
  col: number,
  row: number,
  tileId: WkePathTileId | null,
): BoardMap {
  const key = pathTileGridKey(col, row);
  const next = { ...(map.pathTileOverrides ?? {}) };

  if (tileId === null) {
    delete next[key];
  } else {
    next[key] = tileId;
  }

  const pathTileOverrides = Object.keys(next).length > 0 ? next : undefined;
  return { ...map, pathTileOverrides };
}

export function clearPathTileOverrides(map: BoardMap): BoardMap {
  if (!map.pathTileOverrides) return map;
  const { pathTileOverrides: _removed, ...rest } = map;
  return rest;
}

export function hasPathTileOverrides(map: BoardMap): boolean {
  return map.pathTileOverrides != null && Object.keys(map.pathTileOverrides).length > 0;
}

export type PathTileOverrideEntry = {  col: number;
  row: number;
  tileId: WkePathTileId;
  autotileId: WkePathTileId;
  pathIndex?: number;
  spaceId?: number;
  spaceLabel?: string;
};

function parseGridKey(key: string): { col: number; row: number } | null {
  const [colStr, rowStr] = key.split(",");
  const col = Number(colStr);
  const row = Number(rowStr);
  if (!Number.isInteger(col) || !Number.isInteger(row)) return null;
  return { col, row };
}

/** Manual path tile overrides sorted by path index (then grid position). */
export function listPathTileOverrides(map: BoardMap): PathTileOverrideEntry[] {
  if (!map.pathTileOverrides) return [];

  const pathGrid = buildPathIndexGrid(map);
  const entries: PathTileOverrideEntry[] = [];

  for (const [key, tileId] of Object.entries(map.pathTileOverrides)) {
    const parsed = parseGridKey(key);
    if (!parsed) continue;

    const { col, row } = parsed;
    const pathIndex = pathGrid.pathIndexAt[row]?.[col];
    const space = pathIndex !== undefined ? spaceAtPathIndex(map, pathIndex) : null;

    entries.push({
      col,
      row,
      tileId,
      autotileId: pathAutotileAt(col, row, pathGrid.pathCells),
      pathIndex,
      spaceId: space?.id,
      spaceLabel: space?.label,
    });
  }

  return entries.sort((a, b) => {
    const pathDiff = (a.pathIndex ?? 9999) - (b.pathIndex ?? 9999);
    if (pathDiff !== 0) return pathDiff;
    if (a.row !== b.row) return a.row - b.row;
    return a.col - b.col;
  });
}

export function countPathTileOverrides(map: BoardMap): number {
  return listPathTileOverrides(map).length;
}
