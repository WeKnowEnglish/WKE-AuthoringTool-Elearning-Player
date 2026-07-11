import {
  GRASS_TILE_BASE_VARIANTS,
  GRASS_TILE_DECOR_VARIANTS,
  GRASS_TILE_SIZE_PX,
  grassTileRowTopPx,
  grassTilemapHeightPx,
  grassTilemapWidthPx,
  type GrassTileId,
} from "@/lib/live-game/tiles/grass-tile-pack";
import type { LiveGameTilemapDef } from "@/lib/live-game/modes/types";

const COLS = 20;
const ROWS = 11;

/** River band — matches collision rect y≈280, h≈40 at 48px tiles (rows 5–6). */
const RIVER_ROW_START = 5;
const RIVER_ROW_END = 6;
const RIVER_COL_START = 4;
const RIVER_COL_END = 15;

/** North choke column (legacy map note — no longer used for collision). */
const NORTH_CHOKE_COL = 14;

function hashCell(col: number, row: number): number {
  return (col * 374761 + row * 668265) % 1000;
}

function pickBaseTile(col: number, row: number): GrassTileId {
  const h = hashCell(col, row);
  if (row >= 7) {
    return h % 5 === 0 ? "darkgreen_grass" : "green_grass";
  }
  if (row <= 3) {
    return h % 4 === 0 ? "yellow_grass" : "green_grass";
  }
  const idx = h % GRASS_TILE_BASE_VARIANTS.length;
  return GRASS_TILE_BASE_VARIANTS[idx] ?? "green_grass";
}

function maybeDecorTile(col: number, row: number): GrassTileId | null {
  const h = hashCell(col + 7, row + 13);
  if (h % 17 !== 0) return null;
  const idx = h % GRASS_TILE_DECOR_VARIANTS.length;
  return GRASS_TILE_DECOR_VARIANTS[idx] ?? null;
}

function isRiverCell(col: number, row: number): boolean {
  return (
    row >= RIVER_ROW_START &&
    row <= RIVER_ROW_END &&
    col >= RIVER_COL_START &&
    col <= RIVER_COL_END
  );
}

function buildCells(): (GrassTileId | null)[][] {
  const cells: (GrassTileId | null)[][] = [];
  for (let row = 0; row < ROWS; row += 1) {
    const rowCells: (GrassTileId | null)[] = [];
    for (let col = 0; col < COLS; col += 1) {
      if (isRiverCell(col, row)) {
        rowCells.push(null);
        continue;
      }
      const decor = maybeDecorTile(col, row);
      rowCells.push(decor ?? pickBaseTile(col, row));
    }
    cells.push(rowCells);
  }
  return cells;
}

export const ENGLISH_CRAFT_TILEMAP_V1: LiveGameTilemapDef = {
  cols: COLS,
  rows: ROWS,
  tileSizePx: GRASS_TILE_SIZE_PX,
  cells: buildCells(),
};

/** Water overlay aligned to river null cells. */
export const ENGLISH_CRAFT_RIVER_OVERLAY = {
  x: RIVER_COL_START * GRASS_TILE_SIZE_PX,
  y: grassTileRowTopPx(RIVER_ROW_START),
  w: (RIVER_COL_END - RIVER_COL_START + 1) * GRASS_TILE_SIZE_PX,
  h:
    grassTileRowTopPx(RIVER_ROW_END) +
    GRASS_TILE_SIZE_PX -
    grassTileRowTopPx(RIVER_ROW_START),
};

export const ENGLISH_CRAFT_MAP_PIXELS = {
  width: grassTilemapWidthPx(COLS),
  height: grassTilemapHeightPx(ROWS),
};

export const ENGLISH_CRAFT_NORTH_CHOKE_COL = NORTH_CHOKE_COL;

export const ENGLISH_CRAFT_RIVER_CELL_BOUNDS = {
  rowStart: RIVER_ROW_START,
  rowEnd: RIVER_ROW_END,
  colStart: RIVER_COL_START,
  colEnd: RIVER_COL_END,
} as const;
