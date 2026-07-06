import type { SpriteRect } from "@/lib/topdown/types";
import {
  WKE_PATH_CELL,
  WKE_PATH_COLS,
  WKE_PATH_ROWS,
  wkePathAutodetectedBounds,
} from "@/lib/topdown/wke-sprite-atlas";

/** WKE dirt-on-grass path sheet — 4×4 grid of 300×300 cells. */
export const WKE_PATH_GRID = {
  columns: WKE_PATH_COLS.length,
  rows: WKE_PATH_ROWS.length,
  cellWidth: WKE_PATH_CELL.sw,
  cellHeight: WKE_PATH_CELL.sh,
} as const;

function clampRect(rect: SpriteRect, sheetWidth: number, sheetHeight: number): SpriteRect {
  const sw = Math.min(rect.sw, sheetWidth);
  const sh = Math.min(rect.sh, sheetHeight);
  return {
    sx: Math.max(0, Math.min(rect.sx, sheetWidth - sw)),
    sy: Math.max(0, Math.min(rect.sy, sheetHeight - sh)),
    sw,
    sh,
  };
}

function nearestIndex(value: number, centers: number[]): number {
  let bestIdx = 0;
  let bestDist = Number.POSITIVE_INFINITY;
  for (let i = 0; i < centers.length; i++) {
    const dist = Math.abs(value - centers[i]!);
    if (dist < bestDist) {
      bestDist = dist;
      bestIdx = i;
    }
  }
  return bestIdx;
}

/** Snap detect/manual bounds to the nearest WKE path grid cell. */
export function snapBoundsToWkePathGrid(
  rect: SpriteRect,
  sheetWidth: number,
  sheetHeight: number,
  click?: { x: number; y: number },
): SpriteRect {
  const anchorX = click?.x ?? rect.sx + rect.sw / 2;
  const anchorY = click?.y ?? rect.sy + rect.sh / 2;

  const colCenters = WKE_PATH_COLS.map((sx) => sx + WKE_PATH_CELL.sw / 2);
  const rowCenters = WKE_PATH_ROWS.map((sy) => sy + WKE_PATH_CELL.sh / 2);
  const col = nearestIndex(anchorX, colCenters);
  const row = nearestIndex(anchorY, rowCenters);

  return clampRect(wkePathAutodetectedBounds(row, col), sheetWidth, sheetHeight);
}

/** WKE path detect tuning — 300×300 cells with gutter lines. */
export const WKE_PATH_DETECT_OPTIONS = {
  maxCellSize: 320,
  minSize: 200,
  bgTolerance: 40,
  maxFill: 100_000,
  gutterBandHalf: 160,
  gutterRatio: 0.78,
  gutterScanFullAxis: true,
} as const;
