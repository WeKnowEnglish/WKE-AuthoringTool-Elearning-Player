import { pathTileGridKey } from "@/lib/board-game/map/path-tile-overrides";
import { spaceAtPathIndex } from "@/lib/board-game/map/generate-map";
import type { BoardMap } from "@/lib/board-game/map/types";
import { buildBoardTilemap } from "@/lib/board-game/render/build-board-tilemap";
import type { WkeTerrainTileId } from "@/lib/topdown/wke-sprite-atlas";

export { pathTileGridKey as terrainTileGridKey };

export function getTerrainTileOverride(
  map: BoardMap,
  col: number,
  row: number,
): WkeTerrainTileId | undefined {
  return map.terrainTileOverrides?.[pathTileGridKey(col, row)];
}

export function setTerrainTileOverride(
  map: BoardMap,
  col: number,
  row: number,
  tileId: WkeTerrainTileId | null,
): BoardMap {
  const key = pathTileGridKey(col, row);
  const next = { ...(map.terrainTileOverrides ?? {}) };

  if (tileId === null) {
    delete next[key];
  } else {
    next[key] = tileId;
  }

  const terrainTileOverrides = Object.keys(next).length > 0 ? next : undefined;
  return { ...map, terrainTileOverrides };
}

export function clearTerrainTileOverrides(map: BoardMap): BoardMap {
  if (!map.terrainTileOverrides) return map;
  const { terrainTileOverrides: _removed, ...rest } = map;
  return rest;
}

export function hasTerrainTileOverrides(map: BoardMap): boolean {
  return map.terrainTileOverrides != null && Object.keys(map.terrainTileOverrides).length > 0;
}

export type TerrainTileOverrideEntry = {
  col: number;
  row: number;
  tileId: WkeTerrainTileId;
  autotileId: WkeTerrainTileId;
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

export function listTerrainTileOverrides(map: BoardMap): TerrainTileOverrideEntry[] {
  if (!map.terrainTileOverrides) return [];

  const tilemap = buildBoardTilemap({
    ...map,
    terrainTileOverrides: undefined,
  });
  const entries: TerrainTileOverrideEntry[] = [];

  for (const [key, tileId] of Object.entries(map.terrainTileOverrides)) {
    const parsed = parseGridKey(key);
    if (!parsed) continue;

    const { col, row } = parsed;
    const pathIndex = tilemap.pathIndexAt[row]?.[col];
    const space = pathIndex !== undefined ? spaceAtPathIndex(map, pathIndex) : null;

    entries.push({
      col,
      row,
      tileId,
      autotileId: tilemap.terrain[row]?.[col] ?? tileId,
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

export function countTerrainTileOverrides(map: BoardMap): number {
  return listTerrainTileOverrides(map).length;
}
