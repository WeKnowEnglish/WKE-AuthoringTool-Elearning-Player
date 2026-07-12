import {
  ENGLISH_CRAFT_RIVER_CELL_BOUNDS,
  isPerimeterWaterCell,
} from "@/lib/live-game/modes/english-craft/tilemap-v1";

const MAP_COLS = 20;
const MAP_ROWS = 11;

/** Player spawn tiles — keep clear for foot traffic. */
export const ENGLISH_CRAFT_SPAWN_CELLS_V1 = [
  { col: 2, row: 9 },
  { col: 4, row: 9 },
  { col: 6, row: 9 },
  { col: 8, row: 9 },
  { col: 10, row: 9 },
  { col: 12, row: 9 },
] as const;

export type MapCell = { col: number; row: number };

function cellKey(col: number, row: number): string {
  return `${col},${row}`;
}

function isRiverCell(col: number, row: number): boolean {
  const { rowStart, rowEnd, colStart, colEnd } = ENGLISH_CRAFT_RIVER_CELL_BOUNDS;
  return row >= rowStart && row <= rowEnd && col >= colStart && col <= colEnd;
}

/** Row above the river — resource sprites sit low on the tile and overlap water collision. */
function isRiverPlacementBufferCell(col: number, row: number): boolean {
  const { rowStart, colStart, colEnd } = ENGLISH_CRAFT_RIVER_CELL_BOUNDS;
  return row === rowStart - 1 && col >= colStart && col <= colEnd;
}

function isBlockedPlacementCell(col: number, row: number): boolean {
  return isRiverCell(col, row) || isRiverPlacementBufferCell(col, row) || isPerimeterWaterCell(col, row);
}

export function buildBlockedMapCells(structureCells: readonly MapCell[]): Set<string> {
  const blocked = new Set<string>();

  for (let row = 0; row < MAP_ROWS; row += 1) {
    for (let col = 0; col < MAP_COLS; col += 1) {
      if (isBlockedPlacementCell(col, row)) blocked.add(cellKey(col, row));
    }
  }

  for (const cell of structureCells) {
    blocked.add(cellKey(cell.col, cell.row));
  }

  for (const cell of ENGLISH_CRAFT_SPAWN_CELLS_V1) {
    blocked.add(cellKey(cell.col, cell.row));
  }

  return blocked;
}

export function listAvailableMapCells(blocked: Set<string>): MapCell[] {
  const available: MapCell[] = [];
  for (let row = 0; row < MAP_ROWS; row += 1) {
    for (let col = 0; col < MAP_COLS; col += 1) {
      if (!blocked.has(cellKey(col, row))) {
        available.push({ col, row });
      }
    }
  }
  return available;
}

/** Spread picks across the full sorted cell list (row-major). */
export function pickSpreadCells(available: MapCell[], count: number): MapCell[] {
  if (count <= 0) return [];
  if (count >= available.length) return [...available];

  const picks: MapCell[] = [];
  for (let index = 0; index < count; index += 1) {
    const slot = Math.floor((index * available.length) / count);
    picks.push(available[slot]!);
  }

  const seen = new Set<string>();
  const unique: MapCell[] = [];
  for (const cell of picks) {
    const key = cellKey(cell.col, cell.row);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(cell);
  }

  if (unique.length < count) {
    for (const cell of available) {
      const key = cellKey(cell.col, cell.row);
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(cell);
      if (unique.length >= count) break;
    }
  }

  return unique.slice(0, count);
}
