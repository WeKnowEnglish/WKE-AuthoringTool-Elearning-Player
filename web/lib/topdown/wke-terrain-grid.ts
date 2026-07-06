import type { SpriteRect } from "@/lib/topdown/types";
import {
  WKE_TERRAIN_COLS,
  WKE_TERRAIN_ROW_PITCH,
  wkeTerrainAutodetectedBounds,
} from "@/lib/topdown/wke-sprite-atlas";

/** WKE example terrain sheet — left 4×6 grid (~100×104 crops, 115px row pitch). */
export const WKE_TERRAIN_GRID = {
  columns: WKE_TERRAIN_COLS.length,
  rowPitch: WKE_TERRAIN_ROW_PITCH,
  originY: 14,
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

/** Snap detect/manual bounds to the nearest WKE terrain grid cell. */
export function snapBoundsToWkeTerrainGrid(
  rect: SpriteRect,
  sheetWidth: number,
  sheetHeight: number,
  click?: { x: number; y: number },
): SpriteRect {
  const anchorX = click?.x ?? rect.sx + rect.sw / 2;
  const anchorY = click?.y ?? rect.sy + rect.sh / 2;

  const colCenters = WKE_TERRAIN_COLS.map((column) => column.sx + column.sw / 2);
  const col = nearestIndex(anchorX, colCenters);

  const maxRow = Math.max(
    0,
    Math.floor((sheetHeight - WKE_TERRAIN_GRID.originY) / WKE_TERRAIN_ROW_PITCH),
  );
  const rowCenters = Array.from({ length: maxRow + 1 }, (_, row) => {
    const cell = wkeTerrainAutodetectedBounds(row, col);
    return cell.sy + cell.sh / 2;
  });
  const row = nearestIndex(anchorY, rowCenters);

  return clampRect(wkeTerrainAutodetectedBounds(row, col), sheetWidth, sheetHeight);
}

/** WKE terrain detect tuning — ~100×104 crops with gutters. */
export const WKE_TERRAIN_DETECT_OPTIONS = {
  maxCellSize: 108,
  minSize: 90,
  bgTolerance: 32,
  gutterBandHalf: 52,
  gutterRatio: 0.82,
} as const;
