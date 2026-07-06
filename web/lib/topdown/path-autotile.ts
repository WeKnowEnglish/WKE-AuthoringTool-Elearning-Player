import type { WkePathTileId } from "@/lib/topdown/wke-sprite-atlas";

export type PathNeighborMask = {
  n: boolean;
  e: boolean;
  s: boolean;
  w: boolean;
};

/**
 * Cardinal connection shape for a path cell.
 * Tee/cross names indicate which side is open (no path neighbor).
 */
export type PathCellShape =
  | "isolated"
  | "end-n"
  | "end-e"
  | "end-s"
  | "end-w"
  | "straight-ns"
  | "straight-ew"
  | "corner-ne"
  | "corner-se"
  | "corner-sw"
  | "corner-nw"
  | "tee-n"
  | "tee-e"
  | "tee-s"
  | "tee-w"
  | "cross";

/**
 * Canonical WKE 4×4 dirt-on-grass autotile per topology.
 * Derived from omnidirectional sheet semantics + demo reference (first variant per shape).
 */
export const PATH_AUTOTILE_BY_SHAPE: Record<PathCellShape, WkePathTileId> = {
  isolated: "path_r3c3",
  "end-n": "path_r3c2",
  "end-e": "path_r0c3",
  "end-s": "path_r2c3",
  "end-w": "path_r3c0",
  "straight-ns": "path_r1c0",
  "straight-ew": "path_r0c1",
  "corner-ne": "path_r2c0",
  "corner-se": "path_r0c0",
  "corner-sw": "path_r3c1",
  "corner-nw": "path_r3c0",
  "tee-n": "path_r0c2",
  "tee-e": "path_r1c3",
  "tee-s": "path_r2c2",
  "tee-w": "path_r1c2",
  cross: "path_r1c1",
};

function cellKey(col: number, row: number): string {
  return `${col},${row}`;
}

export function pathNeighborMask(
  col: number,
  row: number,
  pathCells: ReadonlySet<string>,
): PathNeighborMask {
  return {
    n: pathCells.has(cellKey(col, row - 1)),
    e: pathCells.has(cellKey(col + 1, row)),
    s: pathCells.has(cellKey(col, row + 1)),
    w: pathCells.has(cellKey(col - 1, row)),
  };
}

export function pathCellShape(mask: PathNeighborMask): PathCellShape {
  const { n, e, s, w } = mask;
  const count = (n ? 1 : 0) + (e ? 1 : 0) + (s ? 1 : 0) + (w ? 1 : 0);

  if (count === 0) return "isolated";
  if (count === 1) {
    if (n) return "end-n";
    if (e) return "end-e";
    if (s) return "end-s";
    return "end-w";
  }
  if (count === 2) {
    if (n && s) return "straight-ns";
    if (e && w) return "straight-ew";
    if (n && e) return "corner-ne";
    if (e && s) return "corner-se";
    if (s && w) return "corner-sw";
    if (w && n) return "corner-nw";
  }
  if (count === 3) {
    if (!n) return "tee-n";
    if (!e) return "tee-e";
    if (!s) return "tee-s";
    return "tee-w";
  }
  return "cross";
}

export function pathAutotileForMask(mask: PathNeighborMask): WkePathTileId {
  return PATH_AUTOTILE_BY_SHAPE[pathCellShape(mask)];
}

export function pathAutotileAt(
  col: number,
  row: number,
  pathCells: ReadonlySet<string>,
): WkePathTileId {
  return pathAutotileForMask(pathNeighborMask(col, row, pathCells));
}

export function pathMaskKey(mask: PathNeighborMask): string {
  return `${mask.n ? 1 : 0}${mask.e ? 1 : 0}${mask.s ? 1 : 0}${mask.w ? 1 : 0}`;
}
