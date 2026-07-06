import type { WkePathTileId, WkeTerrainTileId } from "@/lib/topdown/wke-sprite-atlas";

export type BoardTilemap = {
  cols: number;
  rows: number;
  /** [row][col] — theme terrain; filler off-path, decorated on path cells. */
  terrain: WkeTerrainTileId[][];
  /** [row][col] — dirt path autotile on path cells, null off-path. */
  path: (WkePathTileId | null)[][];
  /** [row][col] — path index on path cells (for START/FINISH overlays). */
  pathIndexAt: (number | undefined)[][];
};
