import { spaceAtPathIndex } from "@/lib/board-game/map/generate-map";
import { buildPathIndexGrid } from "@/lib/board-game/render/path-index-grid";
import { fillerTileForTheme, terrainTileForPathCell } from "@/lib/board-game/render/terrain-tiles";
import type { BoardTilemap } from "@/lib/board-game/render/board-tilemap-types";
import type { BoardMap } from "@/lib/board-game/map/types";
import { getPathTileOverride } from "@/lib/board-game/map/path-tile-overrides";
import { getTerrainTileOverride } from "@/lib/board-game/map/terrain-tile-overrides";
import { pathTerrainDecorationForMap } from "@/lib/board-game/map/path-terrain-decoration";
import { pathAutotileAt } from "@/lib/topdown/path-autotile";

export function boardLengthFromMap(map: BoardMap): number {
  return map.pathOrder.length - 1;
}

export function buildBoardTilemap(map: BoardMap): BoardTilemap {
  const pathGrid = buildPathIndexGrid(map);
  const { cols, rows, pathIndexAt, pathCells } = pathGrid;
  const filler = fillerTileForTheme(map.theme);
  const boardLength = boardLengthFromMap(map);
  const pathTerrainDecoration = pathTerrainDecorationForMap(map);

  const terrain = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => filler),
  );
  const path: BoardTilemap["path"] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => null),
  );

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const pathIndex = pathIndexAt[row]![col];
      if (pathIndex === undefined) continue;

      const space = spaceAtPathIndex(map, pathIndex);
      const autotileTerrain = terrainTileForPathCell({
        theme: map.theme,
        pathIndex,
        boardLength,
        space: space ?? undefined,
        decoration: pathTerrainDecoration,
      });
      terrain[row]![col] = getTerrainTileOverride(map, col, row) ?? autotileTerrain;
      path[row]![col] =
        getPathTileOverride(map, col, row) ?? pathAutotileAt(col, row, pathCells);
    }
  }

  applyOffPathTerrainOverrides(map, terrain, pathIndexAt);

  return { cols, rows, terrain, path, pathIndexAt };
}

function applyOffPathTerrainOverrides(
  map: BoardMap,
  terrain: BoardTilemap["terrain"],
  pathIndexAt: BoardTilemap["pathIndexAt"],
): void {
  if (!map.terrainTileOverrides) return;

  for (const [key, tileId] of Object.entries(map.terrainTileOverrides)) {
    const [colStr, rowStr] = key.split(",");
    const col = Number(colStr);
    const row = Number(rowStr);
    if (!Number.isInteger(col) || !Number.isInteger(row)) continue;
    if (pathIndexAt[row]?.[col] !== undefined) continue;
    if (terrain[row]?.[col] !== undefined) {
      terrain[row]![col] = tileId;
    }
  }
}
