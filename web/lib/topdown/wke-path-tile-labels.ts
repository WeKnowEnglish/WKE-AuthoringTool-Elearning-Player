import {
  PATH_AUTOTILE_BY_SHAPE,
  type PathCellShape,
} from "@/lib/topdown/path-autotile";
import type { WkePathTileId } from "@/lib/topdown/wke-sprite-atlas";

/** Human-readable topology names for path autotile shapes. */
export const PATH_SHAPE_DISPLAY: Record<PathCellShape, string> = {
  isolated: "Isolated",
  "end-n": "End · open North",
  "end-e": "End · open East",
  "end-s": "End · open South",
  "end-w": "End · open West",
  "straight-ns": "Straight · North↕South",
  "straight-ew": "Straight · East↔West",
  "corner-ne": "Corner · North+East",
  "corner-se": "Corner · South+East",
  "corner-sw": "Corner · South+West",
  "corner-nw": "Corner · North+West",
  "tee-n": "T-cross · open North",
  "tee-e": "T-cross · open East",
  "tee-s": "T-cross · open South",
  "tee-w": "T-cross · open West",
  cross: "Cross · 4-way",
};

/** Short picker title (Corner, Cross, etc.). */
export const PATH_SHAPE_SHORT: Record<PathCellShape, string> = {
  isolated: "Isolated",
  "end-n": "End (N)",
  "end-e": "End (E)",
  "end-s": "End (S)",
  "end-w": "End (W)",
  "straight-ns": "Straight ↕",
  "straight-ew": "Straight ↔",
  "corner-ne": "Corner NE",
  "corner-se": "Corner SE",
  "corner-sw": "Corner SW",
  "corner-nw": "Corner NW",
  "tee-n": "T-cross (N open)",
  "tee-e": "T-cross (E open)",
  "tee-s": "T-cross (S open)",
  "tee-w": "T-cross (W open)",
  cross: "Cross",
};

export type WkePathTileLabel = {
  /** Primary label in the atlas picker. */
  title: string;
  /** Compass / connection hint. */
  subtitle: string;
  /** Topology shape this art is for (if known). */
  shape?: PathCellShape;
  /** Used by live board path autotile (`PATH_AUTOTILE_BY_SHAPE`). */
  liveAutotile: boolean;
  /** Sheet grid position for locating art on the PNG. */
  sheet: string;
};

/**
 * Labels for each cell on the 4×4 path sheet.
 * `liveAutotile` marks the variant wired into `pathAutotileAt` for that topology.
 */
export const WKE_PATH_TILE_LABELS: Record<WkePathTileId, WkePathTileLabel> = {
  path_r0c0: {
    title: "Corner SE",
    subtitle: "Path connects South + East",
    shape: "corner-se",
    liveAutotile: true,
    sheet: "Row 0 · Col 0",
  },
  path_r0c1: {
    title: "Straight ↔",
    subtitle: "Path connects East + West",
    shape: "straight-ew",
    liveAutotile: true,
    sheet: "Row 0 · Col 1",
  },
  path_r0c2: {
    title: "T-cross (N open)",
    subtitle: "Path on E+S+W — open to North",
    shape: "tee-n",
    liveAutotile: true,
    sheet: "Row 0 · Col 2",
  },
  path_r0c3: {
    title: "End (E)",
    subtitle: "Path dead-end · open East",
    shape: "end-e",
    liveAutotile: true,
    sheet: "Row 0 · Col 3",
  },
  path_r1c0: {
    title: "Straight ↕",
    subtitle: "Path connects North + South",
    shape: "straight-ns",
    liveAutotile: true,
    sheet: "Row 1 · Col 0",
  },
  path_r1c1: {
    title: "Cross",
    subtitle: "Path connects all four sides",
    shape: "cross",
    liveAutotile: true,
    sheet: "Row 1 · Col 1",
  },
  path_r1c2: {
    title: "T-cross (W open)",
    subtitle: "Path on N+E+S — open to West",
    shape: "tee-w",
    liveAutotile: true,
    sheet: "Row 1 · Col 2",
  },
  path_r1c3: {
    title: "T-cross (E open)",
    subtitle: "Path on N+S+W — open to East",
    shape: "tee-e",
    liveAutotile: true,
    sheet: "Row 1 · Col 3",
  },
  path_r2c0: {
    title: "Corner NE",
    subtitle: "Path connects North + East",
    shape: "corner-ne",
    liveAutotile: true,
    sheet: "Row 2 · Col 0",
  },
  path_r2c1: {
    title: "Cross (alt art)",
    subtitle: "Extra cross variant on sheet — not used by autotile",
    shape: "cross",
    liveAutotile: false,
    sheet: "Row 2 · Col 1",
  },
  path_r2c2: {
    title: "T-cross (S open)",
    subtitle: "Path on N+E+W — open to South",
    shape: "tee-s",
    liveAutotile: true,
    sheet: "Row 2 · Col 2",
  },
  path_r2c3: {
    title: "End (S)",
    subtitle: "Path dead-end · open South",
    shape: "end-s",
    liveAutotile: true,
    sheet: "Row 2 · Col 3",
  },
  path_r3c0: {
    title: "Corner NW",
    subtitle: "Path connects North + West (also End W art)",
    shape: "corner-nw",
    liveAutotile: true,
    sheet: "Row 3 · Col 0",
  },
  path_r3c1: {
    title: "Corner SW",
    subtitle: "Path connects South + West",
    shape: "corner-sw",
    liveAutotile: true,
    sheet: "Row 3 · Col 1",
  },
  path_r3c2: {
    title: "End (N)",
    subtitle: "Path dead-end · open North",
    shape: "end-n",
    liveAutotile: true,
    sheet: "Row 3 · Col 2",
  },
  path_r3c3: {
    title: "Isolated",
    subtitle: "Single path pad · no neighbors",
    shape: "isolated",
    liveAutotile: true,
    sheet: "Row 3 · Col 3",
  },
};

const LIVE_AUTOTILE_SHAPES_BY_ID = new Map<WkePathTileId, PathCellShape[]>(
  Object.entries(PATH_AUTOTILE_BY_SHAPE).reduce((acc, [shape, id]) => {
    const tileId = id as WkePathTileId;
    const shapes = acc.get(tileId) ?? [];
    shapes.push(shape as PathCellShape);
    acc.set(tileId, shapes);
    return acc;
  }, new Map<WkePathTileId, PathCellShape[]>()),
);

export function pathTileLabel(assetId: WkePathTileId): WkePathTileLabel {
  return WKE_PATH_TILE_LABELS[assetId];
}

/** All live autotile topologies that resolve to this sheet cell. */
export function pathTileLiveShapes(assetId: WkePathTileId): PathCellShape[] {
  return LIVE_AUTOTILE_SHAPES_BY_ID.get(assetId) ?? [];
}

/** Primary live shape when exactly one topology uses this tile. */
export function pathTileLiveShape(assetId: WkePathTileId): PathCellShape | undefined {
  const shapes = pathTileLiveShapes(assetId);
  if (shapes.length === 1) return shapes[0];
  return WKE_PATH_TILE_LABELS[assetId].shape;
}

export function pathShapeDisplay(shape: PathCellShape): string {
  return PATH_SHAPE_DISPLAY[shape];
}
