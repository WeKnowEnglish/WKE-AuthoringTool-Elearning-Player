import { spaceById } from "@/lib/board-game/map/generate-map";
import { getPathTileOverride } from "@/lib/board-game/map/path-tile-overrides";
import type { BoardMap, BoardMapSpace } from "@/lib/board-game/map/types";
import { buildPathIndexGrid } from "@/lib/board-game/render/path-index-grid";
import { pathAutotileAt } from "@/lib/topdown/path-autotile";
import type { WkePathTileId } from "@/lib/topdown/wke-sprite-atlas";

export type PathTileAtCell = {
  /** Tile rendered on this cell (override when set, otherwise autotile). */
  effective: WkePathTileId;
  /** Topology-based autotile for this grid cell. */
  autotile: WkePathTileId;
  /** Manual pick stored on the map, if any. */
  override?: WkePathTileId;
  /** True when `override` is set. */
  isManual: boolean;
};

/**
 * Resolve effective, autotile, and override state for a path grid cell.
 * Returns `null` when the cell is not part of the map path.
 */
export function pathTileAtCell(map: BoardMap, col: number, row: number): PathTileAtCell | null {
  const pathGrid = buildPathIndexGrid(map);
  if (!pathGrid.pathCells.has(`${col},${row}`)) return null;

  const autotile = pathAutotileAt(col, row, pathGrid.pathCells);
  const override = getPathTileOverride(map, col, row);

  return {
    effective: override ?? autotile,
    autotile,
    override,
    isManual: override != null,
  };
}

export function pathTileAtSpace(map: BoardMap, space: BoardMapSpace): PathTileAtCell | null {
  return pathTileAtCell(map, space.grid.col, space.grid.row);
}

export function pathTileAtSpaceId(map: BoardMap, spaceId: number): PathTileAtCell | null {
  const space = spaceById(map, spaceId);
  if (!space) return null;
  return pathTileAtSpace(map, space);
}
