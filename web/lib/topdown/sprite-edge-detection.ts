import type { SpriteRect } from "@/lib/topdown/types";

export type Rgb = { r: number; g: number; b: number };

export type BackgroundPixelTest = (
  r: number,
  g: number,
  b: number,
  bg: Rgb,
  tolerance: number,
) => boolean;

export type EdgeDetectOptions = {
  /** Max RGB distance from background to count as gutter (default 32). */
  bgTolerance?: number;
  /** Custom background classifier — letter fruit uses luminance-aware gutter test. */
  isBackground?: BackgroundPixelTest;
  /** Minimum detected width/height (default 8). */
  minSize?: number;
  /** Max pixels to flood-fill (default 12000). */
  maxFill?: number;
  /** Spiral search radius when clicking gutter (default 120). */
  searchRadius?: number;
  /** Max auto-detected cell size for dense sheets (default 120). */
  maxCellSize?: number;
  /** Half-height/width of band used to classify gutter lines (default 56). */
  gutterBandHalf?: number;
  /** Fraction of gutter-band pixels that must match background (default 0.82). */
  gutterRatio?: number;
  /** Scan full sheet height/width when probing gutter lines (better for large cells). */
  gutterScanFullAxis?: boolean;
  /** Skip gutter grid snap; flood-fill from click only (irregular / large sprites). */
  floodFillOnly?: boolean;
  /**
   * Extra pixels added on each side after detect (captures anti-alias fringe).
   * Gutter knockout in preview handles any included sheet grey.
   */
  boundsPadding?: number;
  /** When true, skip the post-detect tighten pass (default: same as floodFillOnly). */
  skipTighten?: boolean;
  /** Restrict flood-fill to this sheet rectangle (e.g. one letter-fruit column). */
  clipRect?: SpriteRect;
};

function pixelIndex(width: number, x: number, y: number): number {
  return (y * width + x) * 4;
}

export function estimateBackgroundColor(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  sampleSize = 8,
): Rgb {
  const corners = [
    { x: 0, y: 0 },
    { x: Math.max(0, width - sampleSize), y: 0 },
    { x: 0, y: Math.max(0, height - sampleSize) },
    { x: Math.max(0, width - sampleSize), y: Math.max(0, height - sampleSize) },
  ];

  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;

  for (const corner of corners) {
    for (let y = corner.y; y < corner.y + sampleSize && y < height; y++) {
      for (let x = corner.x; x < corner.x + sampleSize && x < width; x++) {
        const i = pixelIndex(width, x, y);
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
        count++;
      }
    }
  }

  if (count === 0) return { r: 58, g: 58, b: 58 };
  return { r: r / count, g: g / count, b: b / count };
}

export function colorDistance(bg: Rgb, r: number, g: number, b: number): number {
  const dr = bg.r - r;
  const dg = bg.g - g;
  const db = bg.b - b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

export function pixelLuminance(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

const defaultBackgroundTest: BackgroundPixelTest = (r, g, b, bg, tolerance) =>
  colorDistance(bg, r, g, b) <= tolerance;

/**
 * Letter-fruit sheets: dark shadows, soil, and leaf shading stay art.
 * Pixels darker than the sheet gutter but within RGB tolerance are interior
 * shadow — not background. Only neutral gutter at or above gutter luminance keys.
 */
export function isLetterFruitSheetBackground(
  r: number,
  g: number,
  b: number,
  bg: Rgb,
  tolerance: number,
): boolean {
  const dist = colorDistance(bg, r, g, b);
  if (dist > tolerance) return false;
  const lum = pixelLuminance(r, g, b);
  const bgLum = pixelLuminance(bg.r, bg.g, bg.b);
  if (lum < bgLum - 2) return false;
  return true;
}

export function isBackgroundRgb(
  r: number,
  g: number,
  b: number,
  bg: Rgb,
  tolerance: number,
  test: BackgroundPixelTest = defaultBackgroundTest,
): boolean {
  return test(r, g, b, bg, tolerance);
}

export function isBackgroundPixel(
  data: Uint8ClampedArray,
  width: number,
  x: number,
  y: number,
  bg: Rgb,
  tolerance: number,
  test?: BackgroundPixelTest,
): boolean {
  const i = pixelIndex(width, x, y);
  return isBackgroundRgb(data[i], data[i + 1], data[i + 2], bg, tolerance, test);
}

/** Content for flood-fill — treats semi-transparent pixels as art (anti-alias). */
export function isContentPixel(
  data: Uint8ClampedArray,
  width: number,
  x: number,
  y: number,
  bg: Rgb,
  tolerance: number,
  test?: BackgroundPixelTest,
): boolean {
  const i = pixelIndex(width, x, y);
  const alpha = data[i + 3];
  if (alpha < 12) return false;
  if (alpha < 252) return true;
  return !isBackgroundPixel(data, width, x, y, bg, tolerance, test);
}

/** Expand a rect within sheet bounds — safety cushion after tight detect. */
export function inflateSpriteBounds(
  rect: SpriteRect,
  padding: number,
  sheetWidth: number,
  sheetHeight: number,
): SpriteRect {
  if (padding <= 0) return rect;
  const sx = Math.max(0, rect.sx - padding);
  const sy = Math.max(0, rect.sy - padding);
  const sw = Math.min(sheetWidth - sx, rect.sw + padding * 2);
  const sh = Math.min(sheetHeight - sy, rect.sh + padding * 2);
  return { sx, sy, sw, sh };
}

/** Bounding box of all content pixels inside a sheet rectangle (no flood-fill). */
export function bboxOfContentInRect(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  rect: SpriteRect,
  options: Pick<EdgeDetectOptions, "bgTolerance" | "minSize" | "isBackground"> = {},
): SpriteRect | null {
  const tolerance = options.bgTolerance ?? 32;
  const minSize = options.minSize ?? 8;
  const bgTest = options.isBackground;
  const bg = estimateBackgroundColor(data, width, height);

  const x0 = Math.max(0, rect.sx);
  const y0 = Math.max(0, rect.sy);
  const x1 = Math.min(width - 1, rect.sx + rect.sw - 1);
  const y1 = Math.min(height - 1, rect.sy + rect.sh - 1);
  if (x0 > x1 || y0 > y1) return null;

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (!isContentPixel(data, width, x, y, bg, tolerance, bgTest)) continue;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }

  if (!Number.isFinite(minX)) return null;

  const sw = maxX - minX + 1;
  const sh = maxY - minY + 1;
  if (sw < minSize || sh < minSize) return null;

  return { sx: minX, sy: minY, sw, sh };
}

function clampPoint(width: number, height: number, x: number, y: number): { x: number; y: number } {
  return {
    x: Math.max(0, Math.min(width - 1, x)),
    y: Math.max(0, Math.min(height - 1, y)),
  };
}

function pointInClip(
  x: number,
  y: number,
  clip: SpriteRect | undefined,
): boolean {
  if (!clip) return true;
  return (
    x >= clip.sx &&
    x < clip.sx + clip.sw &&
    y >= clip.sy &&
    y < clip.sy + clip.sh
  );
}

function findContentSeed(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  clickX: number,
  clickY: number,
  bg: Rgb,
  tolerance: number,
  searchRadius: number,
  clip?: SpriteRect,
  bgTest?: BackgroundPixelTest,
): { x: number; y: number } | null {
  const start = clampPoint(width, height, clickX, clickY);
  if (
    pointInClip(start.x, start.y, clip) &&
    isContentPixel(data, width, start.x, start.y, bg, tolerance, bgTest)
  ) {
    return start;
  }

  for (let radius = 1; radius <= searchRadius; radius++) {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;
        const x = start.x + dx;
        const y = start.y + dy;
        if (x < 0 || y < 0 || x >= width || y >= height) continue;
        if (!pointInClip(x, y, clip)) continue;
        if (isContentPixel(data, width, x, y, bg, tolerance, bgTest)) {
          return { x, y };
        }
      }
    }
  }

  return null;
}

/** Flood-fill content from a seed and return its bounding box in sheet pixels. */
export function detectSpriteBoundsAtPoint(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  clickX: number,
  clickY: number,
  options: EdgeDetectOptions = {},
): SpriteRect | null {
  const tolerance = options.bgTolerance ?? 32;
  const minSize = options.minSize ?? 8;
  const maxFill = options.maxFill ?? 12_000;
  const searchRadius = options.searchRadius ?? 120;
  const clip = options.clipRect;
  const bgTest = options.isBackground;

  const bg = estimateBackgroundColor(data, width, height);
  const seed = findContentSeed(
    data,
    width,
    height,
    clickX,
    clickY,
    bg,
    tolerance,
    searchRadius,
    clip,
    bgTest,
  );
  if (!seed) return null;

  const visited = new Uint8Array(width * height);
  const queue: number[] = [seed.x, seed.y];
  visited[seed.y * width + seed.x] = 1;

  let minX = seed.x;
  let maxX = seed.x;
  let minY = seed.y;
  let maxY = seed.y;
  let filled = 0;

  while (queue.length > 0 && filled < maxFill) {
    const y = queue.pop()!;
    const x = queue.pop()!;
    filled++;

    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);

    const neighbors = [
      [x - 1, y],
      [x + 1, y],
      [x, y - 1],
      [x, y + 1],
    ] as const;

    for (const [nx, ny] of neighbors) {
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      if (!pointInClip(nx, ny, clip)) continue;
      const idx = ny * width + nx;
      if (visited[idx]) continue;
      if (!isContentPixel(data, width, nx, ny, bg, tolerance, bgTest)) continue;
      visited[idx] = 1;
      queue.push(nx, ny);
    }
  }

  const sw = maxX - minX + 1;
  const sh = maxY - minY + 1;
  if (sw < minSize || sh < minSize) return null;

  return { sx: minX, sy: minY, sw, sh };
}

/** Trim gutters by shrinking until edge rows/cols are mostly background. */
export function tightenSpriteBounds(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  rect: SpriteRect,
  options: EdgeDetectOptions = {},
): SpriteRect {
  const tolerance = options.bgTolerance ?? 32;
  const minSize = options.minSize ?? 8;
  const bgTest = options.isBackground;
  const bg = estimateBackgroundColor(data, width, height);

  let { sx, sy, sw, sh } = rect;

  function rowBackgroundRatio(y: number): number {
    let bgCount = 0;
    for (let x = sx; x < sx + sw; x++) {
      if (isBackgroundPixel(data, width, x, y, bg, tolerance, bgTest)) bgCount++;
    }
    return bgCount / sw;
  }

  function colBackgroundRatio(x: number): number {
    let bgCount = 0;
    for (let y = sy; y < sy + sh; y++) {
      if (isBackgroundPixel(data, width, x, y, bg, tolerance, bgTest)) bgCount++;
    }
    return bgCount / sh;
  }

  while (sh > minSize && rowBackgroundRatio(sy) > 0.85) {
    sy++;
    sh--;
  }
  while (sh > minSize && rowBackgroundRatio(sy + sh - 1) > 0.85) {
    sh--;
  }
  while (sw > minSize && colBackgroundRatio(sx) > 0.85) {
    sx++;
    sw--;
  }
  while (sw > minSize && colBackgroundRatio(sx + sw - 1) > 0.85) {
    sw--;
  }

  return { sx, sy, sw, sh };
}

export function detectAndTightenSpriteBounds(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  clickX: number,
  clickY: number,
  options?: EdgeDetectOptions,
): SpriteRect | null {
  const detected = detectSpriteBoundsAtPoint(data, width, height, clickX, clickY, options);
  if (!detected) return null;

  const skipTighten = options?.skipTighten ?? options?.floodFillOnly ?? false;
  let rect = skipTighten
    ? detected
    : tightenSpriteBounds(data, width, height, detected, options);

  const padding = options?.boundsPadding ?? 0;
  if (padding > 0) {
    rect = inflateSpriteBounds(rect, padding, width, height);
  }

  return rect;
}

const DEFAULT_MAX_CELL = 120;

function columnBackgroundRatio(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y0: number,
  y1: number,
  bg: Rgb,
  tolerance: number,
): number {
  const top = Math.max(0, y0);
  const bottom = Math.min(height - 1, y1);
  let bgCount = 0;
  let total = 0;
  for (let y = top; y <= bottom; y++) {
    if (x < 0 || x >= width) continue;
    total++;
    if (isBackgroundPixel(data, width, x, y, bg, tolerance)) bgCount++;
  }
  return total === 0 ? 1 : bgCount / total;
}

function rowBackgroundRatio(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  y: number,
  x0: number,
  x1: number,
  bg: Rgb,
  tolerance: number,
): number {
  const left = Math.max(0, x0);
  const right = Math.min(width - 1, x1);
  let bgCount = 0;
  let total = 0;
  for (let x = left; x <= right; x++) {
    if (y < 0 || y >= height) continue;
    total++;
    if (isBackgroundPixel(data, width, x, y, bg, tolerance)) bgCount++;
  }
  return total === 0 ? 1 : bgCount / total;
}

/** Snap to gutter-bounded cell — preferred for dense sprite sheets. */
export function detectGridCellBoundsAtPoint(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  clickX: number,
  clickY: number,
  options: EdgeDetectOptions = {},
): SpriteRect | null {
  const tolerance = options.bgTolerance ?? 32;
  const minSize = options.minSize ?? 8;
  const maxSize = options.maxCellSize ?? DEFAULT_MAX_CELL;
  const bandHalf = options.gutterBandHalf ?? 56;
  const gutterRatio = options.gutterRatio ?? 0.82;
  const scanFullAxis = options.gutterScanFullAxis ?? false;
  const bg = estimateBackgroundColor(data, width, height);

  const y0 = clickY - bandHalf;
  const y1 = clickY + bandHalf;
  const x0 = clickX - bandHalf;
  const x1 = clickX + bandHalf;

  const isGutterCol = (x: number) =>
    columnBackgroundRatio(
      data,
      width,
      height,
      x,
      scanFullAxis ? 0 : y0,
      scanFullAxis ? height - 1 : y1,
      bg,
      tolerance,
    ) >= gutterRatio;
  const isGutterRow = (y: number) =>
    rowBackgroundRatio(
      data,
      width,
      height,
      y,
      scanFullAxis ? 0 : x0,
      scanFullAxis ? width - 1 : x1,
      bg,
      tolerance,
    ) >= gutterRatio;

  let left = clickX;
  while (left > 0 && !isGutterCol(left - 1)) left--;

  let right = clickX;
  while (right < width - 1 && !isGutterCol(right + 1)) right++;

  let top = clickY;
  while (top > 0 && !isGutterRow(top - 1)) top--;

  let bottom = clickY;
  while (bottom < height - 1 && !isGutterRow(bottom + 1)) bottom++;

  const sw = right - left + 1;
  const sh = bottom - top + 1;
  if (sw < minSize || sh < minSize || sw > maxSize || sh > maxSize) return null;

  return { sx: left, sy: top, sw, sh };
}

/**
 * Horizontal gutter snap only — full sheet height column band for strip layouts
 * (letter fruit stage columns). No maxCellSize cap.
 */
export function findGutterBoundedColumnAtPoint(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  clickX: number,
  clickY: number,
  options: EdgeDetectOptions = {},
): SpriteRect | null {
  const tolerance = options.bgTolerance ?? 32;
  const minSize = options.minSize ?? 8;
  const bandHalf = options.gutterBandHalf ?? 56;
  const gutterRatio = options.gutterRatio ?? 0.82;
  const scanFullAxis = options.gutterScanFullAxis ?? true;
  const bg = estimateBackgroundColor(data, width, height);

  const y0 = clickY - bandHalf;
  const y1 = clickY + bandHalf;

  const isGutterCol = (x: number) =>
    columnBackgroundRatio(
      data,
      width,
      height,
      x,
      scanFullAxis ? 0 : y0,
      scanFullAxis ? height - 1 : y1,
      bg,
      tolerance,
    ) >= gutterRatio;

  let left = clickX;
  while (left > 0 && !isGutterCol(left - 1)) left--;

  let right = clickX;
  while (right < width - 1 && !isGutterCol(right + 1)) right++;

  const sw = right - left + 1;
  if (sw < minSize) return null;

  return { sx: left, sy: 0, sw, sh: height };
}

/** Grid snap first, flood-fill fallback — capped for dense atlases unless floodFillOnly. */
export function detectBestSpriteBoundsAtPoint(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  clickX: number,
  clickY: number,
  options?: EdgeDetectOptions,
): SpriteRect | null {
  const maxSize = options?.maxCellSize ?? DEFAULT_MAX_CELL;

  if (!options?.floodFillOnly) {
    const grid = detectGridCellBoundsAtPoint(data, width, height, clickX, clickY, options);
    if (grid) return grid;
  }

  const flooded = detectAndTightenSpriteBounds(data, width, height, clickX, clickY, options);
  if (!flooded) return null;
  if (flooded.sw > maxSize || flooded.sh > maxSize) return null;
  return flooded;
}
