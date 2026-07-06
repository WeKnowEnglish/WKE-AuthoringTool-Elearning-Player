import {
  estimateBackgroundColor,
  isBackgroundPixel,
  isLetterFruitSheetBackground,
  type BackgroundPixelTest,
  type Rgb,
} from "@/lib/topdown/sprite-edge-detection";
import type { SpriteAtlasConfig, SpriteRect } from "@/lib/topdown/types";

/** Matches garden-detect flood-fill tolerance for sheet gutters (pass 1). */
export const GARDEN_SHEET_GUTTER_TOLERANCE = 42;

/** Strict tolerance for enclosed interior holes (pass 2). */
export const GARDEN_SHEET_INTERIOR_GUTTER_TOLERANCE = 12;

const CACHE_VERSION = "dual-tol-v4";

/** Letter-fruit sheets: luminance-aware gutter test on both knockout passes. */
export const LETTER_FRUIT_GUTTER_KEY_OPTIONS: GutterKeyOptions = {
  isBackground: isLetterFruitSheetBackground,
};

const LETTER_FRUIT_IMAGE_PATH = "/assets/Letter%20Fruit%20Stages/";

export function isLetterFruitAtlasImageSrc(imageSrc: string): boolean {
  return imageSrc.includes(LETTER_FRUIT_IMAGE_PATH);
}

export function gutterKeyOptionsForAtlas(
  atlas: Pick<SpriteAtlasConfig, "imageSrc">,
): GutterKeyOptions {
  return isLetterFruitAtlasImageSrc(atlas.imageSrc) ?
      LETTER_FRUIT_GUTTER_KEY_OPTIONS
    : {};
}

const imageLoadCache = new Map<string, Promise<HTMLImageElement>>();
const sheetBgCache = new Map<string, Rgb>();
const dataUrlCache = new Map<string, string>();

export type GutterKeyOptions = {
  /** When false, only border-connected gutter is keyed (legacy behavior). */
  keyInteriorHoles?: boolean;
  /** Pass 1 — border-connected gutter (default: tolerance arg or 42). */
  borderTolerance?: number;
  /** Pass 2 — near-exact gutter in enclosed cavities (default 12). */
  interiorTolerance?: number;
  /** Only key interior components with at least this many pixels (default 0). */
  minInteriorHolePixels?: number;
  /** Custom background classifier — letter fruit preserves dark shadows/soil. */
  isBackground?: BackgroundPixelTest;
};

function loadImage(src: string): Promise<HTMLImageElement> {
  let pending = imageLoadCache.get(src);
  if (!pending) {
    pending = new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.decoding = "async";
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load sprite sheet: ${src}`));
      img.src = src;
    });
    imageLoadCache.set(src, pending);
  }
  return pending;
}

async function getSheetBackground(
  atlas: Pick<SpriteAtlasConfig, "imageSrc" | "width" | "height">,
): Promise<Rgb> {
  const cached = sheetBgCache.get(atlas.imageSrc);
  if (cached) return cached;

  const img = await loadImage(atlas.imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = atlas.width;
  canvas.height = atlas.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas unavailable");

  ctx.drawImage(img, 0, 0, atlas.width, atlas.height);
  const bg = estimateBackgroundColor(
    ctx.getImageData(0, 0, atlas.width, atlas.height).data,
    atlas.width,
    atlas.height,
  );
  sheetBgCache.set(atlas.imageSrc, bg);
  return bg;
}

/** Pass 1 — key gutter pixels 4-connected to the crop border. */
export function keyOutBorderConnectedGutterInImageData(
  image: ImageData,
  bg: Rgb,
  tolerance: number,
  isBackground?: BackgroundPixelTest,
): void {
  const { width, height, data: pixels } = image;
  const visited = new Uint8Array(width * height);
  const queue: number[] = [];

  const enqueue = (x: number, y: number) => {
    const idx = y * width + x;
    if (visited[idx]) return;
    if (!isBackgroundPixel(pixels, width, x, y, bg, tolerance, isBackground)) return;
    visited[idx] = 1;
    queue.push(x, y);
  };

  for (let x = 0; x < width; x++) {
    enqueue(x, 0);
    enqueue(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    enqueue(0, y);
    enqueue(width - 1, y);
  }

  let qi = 0;
  while (qi < queue.length) {
    const x = queue[qi++]!;
    const y = queue[qi++]!;
    const pi = (y * width + x) * 4;
    pixels[pi + 3] = 0;

    if (x > 0) enqueue(x - 1, y);
    if (x < width - 1) enqueue(x + 1, y);
    if (y > 0) enqueue(x, y - 1);
    if (y < height - 1) enqueue(x, y + 1);
  }
}

/**
 * Pass 2 — key enclosed gutter cavities using strict tolerance and optional min size.
 * Run after pass 1 so only interior sheet background remains as candidates.
 */
export function keyOutInteriorGutterHolesInImageData(
  image: ImageData,
  bg: Rgb,
  tolerance: number,
  minHolePixels = 0,
  isBackground?: BackgroundPixelTest,
): void {
  const { width, height, data: pixels } = image;
  const visited = new Uint8Array(width * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (visited[idx]) continue;

      const pi = idx * 4;
      if (pixels[pi + 3]! < 12) continue;
      if (!isBackgroundPixel(pixels, width, x, y, bg, tolerance, isBackground)) continue;

      const component: number[] = [];
      const queue = [x, y];
      visited[idx] = 1;

      while (queue.length > 0) {
        const cy = queue.pop()!;
        const cx = queue.pop()!;
        component.push(cx, cy);

        const neighbors = [
          [cx - 1, cy],
          [cx + 1, cy],
          [cx, cy - 1],
          [cx, cy + 1],
        ] as const;

        for (const [nx, ny] of neighbors) {
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const ni = ny * width + nx;
          if (visited[ni]) continue;
          if (pixels[ni * 4 + 3]! < 12) continue;
          if (!isBackgroundPixel(pixels, width, nx, ny, bg, tolerance, isBackground)) continue;
          visited[ni] = 1;
          queue.push(nx, ny);
        }
      }

      if (component.length / 2 < minHolePixels) continue;

      for (let i = 0; i < component.length; i += 2) {
        const cx = component[i]!;
        const cy = component[i + 1]!;
        pixels[(cy * width + cx) * 4 + 3] = 0;
      }
    }
  }
}

/**
 * Key sheet gutter to transparent — border flood plus enclosed interior holes.
 * Pass 2 uses a stricter tolerance so art shading is not punched out.
 */
export function keyOutGutterInImageData(
  image: ImageData,
  bg: Rgb,
  tolerance: number,
  options: GutterKeyOptions = {},
): void {
  const borderTolerance =
    options.borderTolerance ?? tolerance ?? GARDEN_SHEET_GUTTER_TOLERANCE;
  const interiorTolerance =
    options.interiorTolerance ?? GARDEN_SHEET_INTERIOR_GUTTER_TOLERANCE;
  const minInteriorHolePixels = options.minInteriorHolePixels ?? 0;
  const isBackground = options.isBackground;

  keyOutBorderConnectedGutterInImageData(image, bg, borderTolerance, isBackground);
  if (options.keyInteriorHoles === false) return;
  keyOutInteriorGutterHolesInImageData(
    image,
    bg,
    interiorTolerance,
    minInteriorHolePixels,
    isBackground,
  );
}

/** Rasterize an atlas crop with gutter keyed to transparent PNG. */
export async function getGutterKeyedCropDataUrl(
  atlas: Pick<SpriteAtlasConfig, "imageSrc" | "width" | "height">,
  bounds: SpriteRect,
  tolerance = GARDEN_SHEET_GUTTER_TOLERANCE,
  options: GutterKeyOptions = {},
): Promise<string> {
  const borderTolerance = options.borderTolerance ?? tolerance;
  const interiorTolerance =
    options.interiorTolerance ?? GARDEN_SHEET_INTERIOR_GUTTER_TOLERANCE;
  const minInteriorHolePixels = options.minInteriorHolePixels ?? 0;
  const interiorFlag = options.keyInteriorHoles === false ? 0 : 1;
  const bgTestId = options.isBackground?.name ?? "default";

  const cacheKey = [
    CACHE_VERSION,
    atlas.imageSrc,
    `${bounds.sx},${bounds.sy},${bounds.sw},${bounds.sh}`,
    `b${borderTolerance}`,
    `i${interiorTolerance}`,
    `m${minInteriorHolePixels}`,
    interiorFlag,
    bgTestId,
  ].join(":");

  const hit = dataUrlCache.get(cacheKey);
  if (hit) return hit;

  const [img, bg] = await Promise.all([loadImage(atlas.imageSrc), getSheetBackground(atlas)]);

  const canvas = document.createElement("canvas");
  canvas.width = bounds.sw;
  canvas.height = bounds.sh;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas unavailable");

  ctx.drawImage(
    img,
    bounds.sx,
    bounds.sy,
    bounds.sw,
    bounds.sh,
    0,
    0,
    bounds.sw,
    bounds.sh,
  );
  const cropData = ctx.getImageData(0, 0, bounds.sw, bounds.sh);
  keyOutGutterInImageData(cropData, bg, tolerance, {
    ...options,
    borderTolerance,
    interiorTolerance,
    minInteriorHolePixels,
  });
  ctx.putImageData(cropData, 0, 0);

  const url = canvas.toDataURL("image/png");
  dataUrlCache.set(cacheKey, url);
  return url;
}
