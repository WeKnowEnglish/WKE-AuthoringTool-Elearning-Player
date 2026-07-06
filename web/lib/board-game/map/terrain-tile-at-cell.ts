import { getTerrainTileOverride } from "@/lib/board-game/map/terrain-tile-overrides";
import type { BoardMap, BoardMapSpace } from "@/lib/board-game/map/types";
import { buildBoardTilemap } from "@/lib/board-game/render/build-board-tilemap";
import type { WkeTerrainTileId } from "@/lib/topdown/wke-sprite-atlas";

export type TerrainTileAtCell = {
  effective: WkeTerrainTileId;
  autotile: WkeTerrainTileId;
  override?: WkeTerrainTileId;
  isManual: boolean;
};

function autotileTerrainAt(map: BoardMap, col: number, row: number): WkeTerrainTileId | null {
  const tilemap = buildBoardTilemap({
    ...map,
    terrainTileOverrides: undefined,
  });
  return tilemap.terrain[row]?.[col] ?? null;
}

export function terrainTileAtCell(map: BoardMap, col: number, row: number): TerrainTileAtCell | null {
  const autotile = autotileTerrainAt(map, col, row);
  if (autotile === null) return null;

  const override = getTerrainTileOverride(map, col, row);
  return {
    effective: override ?? autotile,
    autotile,
    override,
    isManual: override != null,
  };
}

export function terrainTileAtSpace(map: BoardMap, space: BoardMapSpace): TerrainTileAtCell | null {
  return terrainTileAtCell(map, space.grid.col, space.grid.row);
}
