import type { EdgeDetectOptions } from "@/lib/topdown/sprite-edge-detection";
import {
  bboxOfContentInRect,
  detectSpriteBoundsAtPoint,
  estimateBackgroundColor,
  inflateSpriteBounds,
  isBackgroundPixel,
  isLetterFruitSheetBackground,
} from "@/lib/topdown/sprite-edge-detection";
import { GARDEN_DETECT_OPTIONS } from "@/lib/topdown/garden-detect";
import type { SpriteRect } from "@/lib/topdown/types";

/** Five growth stages across the 1536px-wide letter fruit sheets. */
export const LETTER_FRUIT_STAGE_COLUMN_COUNT = 5;

/** Vertical bands where stage art appears (seed sits lower than letter forms). */
export const LETTER_FRUIT_ART_BANDS = [
  { y0: 200, y1: 780 },
  { y0: 520, y1: 720 },
] as const;

/** Label text lives in the lower band; soil baselines sit higher on the sheet. */
export const LETTER_FRUIT_LABEL_BAND_SEARCH = {
  yStartRatio: 0.72,
  yEndRatio: 0.82,
  maxBandHeight: 12,
  minArtGap: 8,
} as const;

/** Fallback scan ceiling when label strip is not detected (Letter A ≈ y733). */
export function letterFruitLabelScanFallbackY(sheetHeight: number): number {
  return Math.min(740, Math.floor(sheetHeight * LETTER_FRUIT_LABEL_BAND_SEARCH.yStartRatio));
}

/** @deprecated Use letterFruitOccupancyScanRect + findLetterFruitLabelBandY */
export const LETTER_FRUIT_CONTENT_SCAN_Y = {
  sy: LETTER_FRUIT_ART_BANDS[0].y0,
  sh: letterFruitLabelScanFallbackY(1024) - LETTER_FRUIT_ART_BANDS[0].y0,
} as const;

export type LetterFruitContentColumn = {
  sx: number;
  sw: number;
};

export type LetterFruitLabelBandOptions = {
  bgTolerance?: number;
  /** Min non-background pixels in a column row to count as active. */
  minRowContentPx?: number;
  /** How many columns must be active on a row to count toward a label strip. */
  minActiveColumns?: number;
  /** Consecutive rows required to confirm the label strip. */
  confirmRows?: number;
  /** Pixels of clearance above the detected label strip. */
  margin?: number;
  /** Search window start as a fraction of sheet height. */
  searchYStartRatio?: number;
  /** Search window end as a fraction of sheet height. */
  searchYEndRatio?: number;
  /** Reject bands taller than this — soil baselines are thicker than text. */
  maxBandHeight?: number;
  /** Detected ceiling must be at least this many px below column art. */
  minArtGap?: number;
};

export const LETTER_FRUIT_COLUMN_BLEED_PX = 24;

export type LetterFruitColumnScanOptions = {
  bgTolerance?: number;
  /** Ignore content runs narrower than this (px). */
  minColumnWidth?: number;
  /** Expand columns toward neighbors to cover art that crosses narrow gutters. */
  columnBleedPx?: number;
};

/** Gutter-line scan tuning — retained for future strip variants. */
export const LETTER_FRUIT_GUTTER_COLUMN_OPTIONS = {
  bgTolerance: GARDEN_DETECT_OPTIONS.bgTolerance,
  gutterScanFullAxis: true,
  gutterRatio: 0.78,
  gutterBandHalf: 80,
  minSize: 80,
} as const satisfies EdgeDetectOptions;

export const LETTER_FRUIT_DETECT_OPTIONS = {
  ...GARDEN_DETECT_OPTIONS,
  floodFillOnly: true,
  skipTighten: true,
  maxCellSize: 560,
  maxFill: 200_000,
  searchRadius: 200,
  isBackground: isLetterFruitSheetBackground,
} as const satisfies EdgeDetectOptions;

/** Shared classifier for every letter-fruit pixel scan (detect + label band). */
const LETTER_FRUIT_BACKGROUND_TEST = isLetterFruitSheetBackground;

/** Retry click Y when flood seed lands on gutter above/below stage art. */
const FLOOD_CLICK_Y_RETRIES = [550, 500, 600, 450, 400, 650, 680, 350, 620, 700, 720] as const;

/** Fall back to occupancy when flood crop is narrower than this fraction of the scan column. */
export const LETTER_FRUIT_FLOOD_MIN_COLUMN_WIDTH_RATIO = 0.55;

/** Fall back when flood bottom sits this many px above the column art baseline. */
export const LETTER_FRUIT_SOIL_BOTTOM_MARGIN_PX = 8;

/** Fall back when flood top sits this many px below the column art ceiling. */
export const LETTER_FRUIT_ART_TOP_MARGIN_PX = 8;

function columnHasArt(
  data: Uint8ClampedArray,
  width: number,
  x: number,
  bg: ReturnType<typeof estimateBackgroundColor>,
  tolerance: number,
): boolean {
  for (const band of LETTER_FRUIT_ART_BANDS) {
    for (let y = band.y0; y <= band.y1; y++) {
      if (!isBackgroundPixel(data, width, x, y, bg, tolerance, LETTER_FRUIT_BACKGROUND_TEST)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Scan the sheet for content columns separated by vertical gutters.
 * Uses dual art bands so low seed art and tall letter forms both count.
 */
export function scanLetterFruitContentColumns(
  data: Uint8ClampedArray,
  width: number,
  _height: number,
  options: LetterFruitColumnScanOptions = {},
): LetterFruitContentColumn[] {
  const tolerance = options.bgTolerance ?? GARDEN_DETECT_OPTIONS.bgTolerance ?? 42;
  const minColumnWidth = options.minColumnWidth ?? 60;
  const bg = estimateBackgroundColor(data, width, _height);

  const hasArt: boolean[] = [];
  for (let x = 0; x < width; x++) {
    hasArt.push(columnHasArt(data, width, x, bg, tolerance));
  }

  type Run = { start: number; end: number; isGutter: boolean };
  const runs: Run[] = [];
  let start = 0;
  let gutter = !hasArt[0];

  for (let x = 1; x <= width; x++) {
    const nextGutter = x < width ? !hasArt[x]! : gutter;
    if (nextGutter !== gutter || x === width) {
      runs.push({ start, end: x - 1, isGutter: gutter });
      start = x;
      gutter = nextGutter;
    }
  }

  return runs
    .filter((run) => !run.isGutter && run.end - run.start + 1 >= minColumnWidth)
    .map((run) => ({ sx: run.start, sw: run.end - run.start + 1 }));
}

function expandLetterFruitColumns(
  columns: LetterFruitContentColumn[],
  sheetWidth: number,
  bleedPx: number,
): LetterFruitContentColumn[] {
  if (bleedPx <= 0 || columns.length === 0) return columns;

  const expanded = columns.map((col, index) => {
    const leftLimit = index > 0 ? columns[index - 1]!.sx + columns[index - 1]!.sw : 0;
    const rightLimit =
      index < columns.length - 1 ? columns[index + 1]!.sx : sheetWidth;
    const sx = Math.max(leftLimit, col.sx - bleedPx);
    const right = Math.min(rightLimit, col.sx + col.sw + bleedPx);
    return { sx, sw: right - sx };
  });

  for (let i = 0; i < expanded.length - 1; i++) {
    const current = expanded[i]!;
    const next = expanded[i + 1]!;
    if (current.sx + current.sw > next.sx) {
      const split = Math.floor((current.sx + current.sw + next.sx) / 2);
      expanded[i] = { sx: current.sx, sw: split - current.sx };
      expanded[i + 1] = {
        sx: split,
        sw: next.sx + next.sw - split,
      };
    }
  }

  return expanded;
}

export function scanExpandedLetterFruitContentColumns(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  options: LetterFruitColumnScanOptions = {},
): LetterFruitContentColumn[] {
  return expandLetterFruitColumns(
    scanLetterFruitContentColumns(data, width, height, options),
    width,
    LETTER_FRUIT_COLUMN_BLEED_PX,
  );
}

function countActiveColumnsAtRow(
  data: Uint8ClampedArray,
  width: number,
  y: number,
  columns: LetterFruitContentColumn[],
  bg: ReturnType<typeof estimateBackgroundColor>,
  tolerance: number,
  minRowContentPx: number,
): number {
  let active = 0;
  for (const col of columns) {
    let content = 0;
    const xEnd = Math.min(width, col.sx + col.sw);
    for (let x = Math.max(0, col.sx); x < xEnd; x++) {
      if (!isBackgroundPixel(data, width, x, y, bg, tolerance, LETTER_FRUIT_BACKGROUND_TEST)) {
        content++;
      }
    }
    if (content > minRowContentPx) active++;
  }
  return active;
}

function columnContentTopY(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  column: LetterFruitContentColumn,
  bg: ReturnType<typeof estimateBackgroundColor>,
  tolerance: number,
  y0 = LETTER_FRUIT_ART_BANDS[0].y0,
  yMax = height - 1,
): number {
  const xStart = Math.max(0, column.sx);
  const xEnd = Math.min(width, column.sx + column.sw);
  const yEnd = Math.min(height - 1, yMax);
  for (let y = y0; y <= yEnd; y++) {
    for (let x = xStart; x < xEnd; x++) {
      if (!isBackgroundPixel(data, width, x, y, bg, tolerance, LETTER_FRUIT_BACKGROUND_TEST)) {
        return y;
      }
    }
  }
  return yEnd;
}

function columnContentBottomY(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  column: LetterFruitContentColumn,
  bg: ReturnType<typeof estimateBackgroundColor>,
  tolerance: number,
  y0 = LETTER_FRUIT_ART_BANDS[0].y0,
  yMax = height - 1,
): number {
  const xStart = Math.max(0, column.sx);
  const xEnd = Math.min(width, column.sx + column.sw);
  const yEnd = Math.min(height - 1, yMax);
  for (let y = yEnd; y >= y0; y--) {
    for (let x = xStart; x < xEnd; x++) {
      if (!isBackgroundPixel(data, width, x, y, bg, tolerance, LETTER_FRUIT_BACKGROUND_TEST)) {
        return y;
      }
    }
  }
  return y0;
}

/** Highest content row in a column within the scan band. */
export function letterFruitColumnArtTopY(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  column: LetterFruitContentColumn,
  labelCeilingY: number,
): number {
  const bg = estimateBackgroundColor(data, width, height);
  const tolerance = LETTER_FRUIT_DETECT_OPTIONS.bgTolerance ?? 42;
  return columnContentTopY(
    data,
    width,
    height,
    column,
    bg,
    tolerance,
    LETTER_FRUIT_ART_BANDS[0].y0,
    labelCeilingY - 1,
  );
}

/** Lowest content row in a column within the scan band (includes soil). */
export function letterFruitColumnArtBottomY(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  column: LetterFruitContentColumn,
  labelCeilingY: number,
): number {
  const bg = estimateBackgroundColor(data, width, height);
  const tolerance = LETTER_FRUIT_DETECT_OPTIONS.bgTolerance ?? 42;
  return columnContentBottomY(
    data,
    width,
    height,
    column,
    bg,
    tolerance,
    LETTER_FRUIT_ART_BANDS[0].y0,
    labelCeilingY - 1,
  );
}

function finalizeLetterFruitDetectRect(
  raw: SpriteRect,
  scanRect: SpriteRect,
  padding: number,
  sheetWidth: number,
  sheetHeight: number,
): SpriteRect {
  return clampRectToScan(
    inflateSpriteBounds(raw, padding, sheetWidth, sheetHeight),
    scanRect,
  );
}

function fitsLetterFruitMaxCellSize(rect: SpriteRect, maxSize: number): boolean {
  return rect.sw <= maxSize && rect.sh <= maxSize;
}

export function unionSpriteRects(a: SpriteRect, b: SpriteRect): SpriteRect {
  const sx = Math.min(a.sx, b.sx);
  const sy = Math.min(a.sy, b.sy);
  const right = Math.max(a.sx + a.sw, b.sx + b.sw);
  const bottom = Math.max(a.sy + a.sh, b.sy + b.sh);
  return { sx, sy, sw: right - sx, sh: bottom - sy };
}

function floodCandidateArea(rect: SpriteRect): number {
  return rect.sw * rect.sh;
}

function isBetterFloodCandidate(candidate: SpriteRect, current: SpriteRect | null): boolean {
  if (!current) return true;
  const candidateArea = floodCandidateArea(candidate);
  const currentArea = floodCandidateArea(current);
  if (candidateArea !== currentArea) return candidateArea > currentArea;
  return candidate.sh > current.sh;
}

export function letterFruitBoundsPassQualityGate(
  bounds: SpriteRect,
  scanRect: SpriteRect,
  artTopY: number,
  artBottomY: number,
): boolean {
  return !shouldUseOccupancyFallback(bounds, scanRect, artBottomY, artTopY);
}

function shouldUseOccupancyFallback(
  flood: SpriteRect | null,
  scanRect: SpriteRect,
  artBottomY: number,
  artTopY: number,
): boolean {
  if (!flood) return true;
  if (flood.sw < scanRect.sw * LETTER_FRUIT_FLOOD_MIN_COLUMN_WIDTH_RATIO) return true;
  if (flood.sy > artTopY + LETTER_FRUIT_ART_TOP_MARGIN_PX) return true;
  if (flood.sy + flood.sh < artBottomY - LETTER_FRUIT_SOIL_BOTTOM_MARGIN_PX) return true;
  return false;
}

function shouldMergeOccupancyBbox(
  flood: SpriteRect | null,
  occupancy: SpriteRect,
  scanRect: SpriteRect,
  artTopY: number,
  artBottomY: number,
): boolean {
  if (!flood) return true;
  if (shouldUseOccupancyFallback(flood, scanRect, artBottomY, artTopY)) return true;
  const slack = 2;
  if (occupancy.sy < flood.sy - slack) return true;
  if (occupancy.sy + occupancy.sh > flood.sy + flood.sh + slack) return true;
  if (occupancy.sx < flood.sx - slack) return true;
  if (occupancy.sx + occupancy.sw > flood.sx + flood.sw + slack) return true;
  return false;
}

/** Occupancy bbox of all art pixels inside a column scan rect (Step A classifier). */
export function occupancyBboxInScanRect(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  scanRect: SpriteRect,
  options: { minSize?: number } = {},
): SpriteRect | null {
  const minSize = options.minSize ?? LETTER_FRUIT_DETECT_OPTIONS.minSize ?? 8;
  const padding = LETTER_FRUIT_DETECT_OPTIONS.boundsPadding ?? 0;
  const raw = bboxOfContentInRect(data, width, height, scanRect, {
    bgTolerance: LETTER_FRUIT_DETECT_OPTIONS.bgTolerance,
    minSize,
    isBackground: LETTER_FRUIT_BACKGROUND_TEST,
  });
  if (!raw) return null;
  return finalizeLetterFruitDetectRect(raw, scanRect, padding, width, height);
}

function maxColumnContentBottomY(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  columns: LetterFruitContentColumn[],
  bg: ReturnType<typeof estimateBackgroundColor>,
  tolerance: number,
  yMax?: number,
): number {
  if (columns.length === 0) return LETTER_FRUIT_ART_BANDS[0].y0;
  const ceiling = yMax ?? height - 1;
  return Math.max(
    ...columns.map((col) =>
      columnContentBottomY(data, width, height, col, bg, tolerance, LETTER_FRUIT_ART_BANDS[0].y0, ceiling),
    ),
  );
}

function measureActiveLabelBandHeight(
  data: Uint8ClampedArray,
  width: number,
  y: number,
  yEnd: number,
  columns: LetterFruitContentColumn[],
  bg: ReturnType<typeof estimateBackgroundColor>,
  tolerance: number,
  minRowContentPx: number,
  minActiveColumns: number,
): number {
  if (countActiveColumnsAtRow(data, width, y, columns, bg, tolerance, minRowContentPx) <
    minActiveColumns) {
    return 0;
  }

  let bandEnd = y;
  while (bandEnd < yEnd) {
    const next = bandEnd + 1;
    if (
      countActiveColumnsAtRow(
        data,
        width,
        next,
        columns,
        bg,
        tolerance,
        minRowContentPx,
      ) < minActiveColumns
    ) {
      break;
    }
    bandEnd = next;
  }

  return bandEnd - y + 1;
}

/**
 * Find the scan ceiling Y (exclusive) above the horizontal stage-label strip.
 * Labels appear on the same row across most columns; soil baselines do not.
 */
export function findLetterFruitLabelBandY(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  columns: LetterFruitContentColumn[],
  options: LetterFruitLabelBandOptions = {},
): number | null {
  if (columns.length === 0) return null;

  const tolerance = options.bgTolerance ?? GARDEN_DETECT_OPTIONS.bgTolerance ?? 42;
  const minRowContentPx = options.minRowContentPx ?? 8;
  const minActiveColumns = Math.min(
    options.minActiveColumns ?? 4,
    columns.length,
  );
  const confirmRows = options.confirmRows ?? 2;
  const margin = options.margin ?? 8;
  const searchYStartRatio =
    options.searchYStartRatio ?? LETTER_FRUIT_LABEL_BAND_SEARCH.yStartRatio;
  const searchYEndRatio =
    options.searchYEndRatio ?? LETTER_FRUIT_LABEL_BAND_SEARCH.yEndRatio;
  const maxBandHeight =
    options.maxBandHeight ?? LETTER_FRUIT_LABEL_BAND_SEARCH.maxBandHeight;
  const minArtGap = options.minArtGap ?? LETTER_FRUIT_LABEL_BAND_SEARCH.minArtGap;
  const bg = estimateBackgroundColor(data, width, height);

  const yStart = Math.floor(height * searchYStartRatio);
  const yEnd = Math.floor(height * searchYEndRatio);
  const minArtBottom = maxColumnContentBottomY(
    data,
    width,
    height,
    columns,
    bg,
    tolerance,
    yStart - 1,
  );

  for (let y = yStart; y <= yEnd; y++) {
    const bandHeight = measureActiveLabelBandHeight(
      data,
      width,
      y,
      yEnd,
      columns,
      bg,
      tolerance,
      minRowContentPx,
      minActiveColumns,
    );
    if (bandHeight < confirmRows || bandHeight > maxBandHeight) continue;

    const ceiling = y - margin;
    if (ceiling < minArtBottom + minArtGap) continue;

    return ceiling;
  }

  return null;
}

/** Occupancy scan rect: one gutter column between art top and label ceiling. */
export function letterFruitOccupancyScanRect(
  column: Pick<SpriteRect, "sx" | "sw">,
  labelCeilingY: number,
): SpriteRect {
  const sy = LETTER_FRUIT_ART_BANDS[0].y0;
  const sh = Math.max(60, labelCeilingY - sy);
  return { sx: column.sx, sy, sw: column.sw, sh };
}

export function clampRectToScan(rect: SpriteRect, scanRect: SpriteRect): SpriteRect {
  const sx = Math.max(rect.sx, scanRect.sx);
  const sy = Math.max(rect.sy, scanRect.sy);
  const right = Math.min(rect.sx + rect.sw, scanRect.sx + scanRect.sw);
  const bottom = Math.min(rect.sy + rect.sh, scanRect.sy + scanRect.sh);
  return {
    sx,
    sy,
    sw: Math.max(1, right - sx),
    sh: Math.max(1, bottom - sy),
  };
}

export function resolveLetterFruitLabelCeilingY(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  columns: LetterFruitContentColumn[],
): number {
  const fallback = letterFruitLabelScanFallbackY(height);
  const detected = findLetterFruitLabelBandY(data, width, height, columns);
  if (detected == null) return fallback;
  // Never scan past the fallback — some sheets detect label bands too low.
  return Math.min(detected, fallback);
}

function pickColumnForClick(
  columns: LetterFruitContentColumn[],
  clickX: number,
): LetterFruitContentColumn | null {
  if (columns.length === 0) return null;

  const direct = columns.find(
    (col) => clickX >= col.sx && clickX < col.sx + col.sw,
  );
  if (direct) return direct;

  let best = columns[0]!;
  let bestDist = Infinity;
  for (const col of columns) {
    const center = col.sx + col.sw / 2;
    const dist = Math.abs(clickX - center);
    if (dist < bestDist) {
      bestDist = dist;
      best = col;
    }
  }
  return best;
}

/** Equal-width fifths — fallback when art-band scan fails. */
export function letterFruitStageColumnRectEqual(
  clickX: number,
  sheetWidth: number,
  sheetHeight: number,
  columnCount = LETTER_FRUIT_STAGE_COLUMN_COUNT,
): SpriteRect {
  const colW = Math.floor(sheetWidth / columnCount);
  const col = Math.max(0, Math.min(columnCount - 1, Math.floor(clickX / colW)));
  const sx = col * colW;
  const sw = col === columnCount - 1 ? sheetWidth - sx : colW;
  return { sx, sy: 0, sw, sh: sheetHeight };
}

/**
 * Stage column band from vertical gutters between art regions on the strip sheet.
 * Falls back to equal fifths when scan finds no columns.
 */
export function letterFruitStageColumnFromGutters(
  data: Uint8ClampedArray,
  sheetWidth: number,
  sheetHeight: number,
  clickX: number,
  _clickY?: number,
): SpriteRect {
  const columns = scanExpandedLetterFruitContentColumns(data, sheetWidth, sheetHeight);
  const picked = pickColumnForClick(columns, clickX);
  if (picked) {
    return { sx: picked.sx, sy: 0, sw: picked.sw, sh: sheetHeight };
  }
  return letterFruitStageColumnRectEqual(clickX, sheetWidth, sheetHeight);
}

/** @deprecated Use letterFruitStageColumnRectEqual or letterFruitStageColumnFromGutters */
export const letterFruitStageColumnRect = letterFruitStageColumnRectEqual;

export function detectLetterFruitStageBoundsAtPoint(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  clickX: number,
  clickY: number,
): SpriteRect | null {
  const columns = scanExpandedLetterFruitContentColumns(data, width, height);
  const picked = pickColumnForClick(columns, clickX);
  const column = picked
    ? { sx: picked.sx, sy: 0, sw: picked.sw, sh: height }
    : letterFruitStageColumnRectEqual(clickX, width, height);

  const labelCeiling = resolveLetterFruitLabelCeilingY(data, width, height, columns);
  const scanRect = letterFruitOccupancyScanRect(column, labelCeiling);
  const padding = LETTER_FRUIT_DETECT_OPTIONS.boundsPadding ?? 0;
  const maxSize = LETTER_FRUIT_DETECT_OPTIONS.maxCellSize ?? 560;
  const columnCenterX = Math.floor(scanRect.sx + scanRect.sw / 2);
  const artTopY = letterFruitColumnArtTopY(data, width, height, column, labelCeiling);
  const artBottomY = letterFruitColumnArtBottomY(data, width, height, column, labelCeiling);

  const floodPoints: { x: number; y: number }[] = [];
  const seen = new Set<string>();
  const addPoint = (x: number, y: number) => {
    const key = `${x},${y}`;
    if (seen.has(key)) return;
    seen.add(key);
    floodPoints.push({ x, y });
  };

  addPoint(clickX, clickY);
  addPoint(columnCenterX, clickY);
  for (const y of FLOOD_CLICK_Y_RETRIES) {
    if (y !== clickY) addPoint(clickX, y);
    addPoint(columnCenterX, y);
  }

  let bestFlood: SpriteRect | null = null;
  for (const { x, y } of floodPoints) {
    const raw = detectSpriteBoundsAtPoint(data, width, height, x, y, {
      ...LETTER_FRUIT_DETECT_OPTIONS,
      clipRect: scanRect,
    });
    if (!raw) continue;

    const rect = finalizeLetterFruitDetectRect(raw, scanRect, padding, width, height);
    if (!fitsLetterFruitMaxCellSize(rect, maxSize)) continue;
    if (isBetterFloodCandidate(rect, bestFlood)) bestFlood = rect;
  }

  let result = bestFlood;
  const occupancy = occupancyBboxInScanRect(data, width, height, scanRect);
  if (occupancy && shouldMergeOccupancyBbox(bestFlood, occupancy, scanRect, artTopY, artBottomY)) {
    result =
      bestFlood ?
        clampRectToScan(unionSpriteRects(bestFlood, occupancy), scanRect)
      : occupancy;
  }

  if (!result || !fitsLetterFruitMaxCellSize(result, maxSize)) return null;

  return result;
}
