import {
  estimateBackgroundColor,
  isBackgroundPixel,
} from "@/lib/topdown/sprite-edge-detection";
import { keyOutBorderConnectedGutterInImageData } from "@/lib/topdown/gutter-key-sprite";

export type RemoveSpriteBackgroundResult = {
  src: string;
  width: number;
  height: number;
};

export const MAX_SPRITE_NORM_DIMENSION = 0.85;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not load image for background removal."));
    image.src = src;
  });
}

/** Width / height ratio for a sprite box in normalized scene coordinates. */
export function normalizedSpriteAspect(
  spriteWidth: number,
  spriteHeight: number,
  mediaWidth: number,
  mediaHeight: number,
): number {
  return (spriteWidth / spriteHeight) * (mediaHeight / mediaWidth);
}

export function resizeRectangleWithAspect(
  opposite: { x: number; y: number },
  point: { x: number; y: number },
  aspect: number,
  maxDimension = MAX_SPRITE_NORM_DIMENSION,
): { x: number; y: number; width: number; height: number } {
  const rawWidth = Math.abs(point.x - opposite.x);
  const rawHeight = Math.abs(point.y - opposite.y);
  let width = rawWidth;
  let height = rawHeight;
  if (rawWidth / Math.max(rawHeight, 0.0001) > aspect) {
    width = rawHeight * aspect;
  } else {
    height = rawWidth / aspect;
  }
  width = Math.max(0.01, width);
  height = Math.max(0.01, height);
  if (width > maxDimension) {
    width = maxDimension;
    height = width / aspect;
  }
  if (height > maxDimension) {
    height = maxDimension;
    width = height * aspect;
  }
  const anchorX = point.x < opposite.x ? opposite.x - width : opposite.x;
  const anchorY = point.y < opposite.y ? opposite.y - height : opposite.y;
  return {
    x: Math.max(0, Math.min(1 - width, anchorX)),
    y: Math.max(0, Math.min(1 - height, anchorY)),
    width: Math.min(width, 1),
    height: Math.min(height, 1),
  };
}

export function translateRectangle(
  rect: { x: number; y: number; width: number; height: number },
  dx: number,
  dy: number,
): { x: number; y: number; width: number; height: number } {
  return {
    x: Math.max(0, Math.min(1 - rect.width, rect.x + dx)),
    y: Math.max(0, Math.min(1 - rect.height, rect.y + dy)),
    width: rect.width,
    height: rect.height,
  };
}

/** Crop transparent margins so sprite geometry matches visible art. */
export function trimImageDataToOpaqueBounds(
  imageData: ImageData,
  alphaThreshold = 8,
): ImageData | null {
  const { data, width, height } = imageData;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = data[(y * width + x) * 4 + 3] ?? 0;
      if (alpha > alphaThreshold) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
  }
  if (maxX < minX || maxY < minY) return null;
  const cropWidth = maxX - minX + 1;
  const cropHeight = maxY - minY + 1;
  if (cropWidth === width && cropHeight === height) return imageData;
  const cropped = new ImageData(cropWidth, cropHeight);
  for (let y = 0; y < cropHeight; y++) {
    for (let x = 0; x < cropWidth; x++) {
      const source = ((minY + y) * width + (minX + x)) * 4;
      const target = (y * cropWidth + x) * 4;
      cropped.data[target] = data[source] ?? 0;
      cropped.data[target + 1] = data[source + 1] ?? 0;
      cropped.data[target + 2] = data[source + 2] ?? 0;
      cropped.data[target + 3] = data[source + 3] ?? 0;
    }
  }
  return cropped;
}

export function imageDataToPngSrc(imageData: ImageData): string {
  const canvas = document.createElement("canvas");
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL("image/png");
}

export async function prepareSpriteImage(
  src: string,
  options: { removeBackground?: boolean; trim?: boolean; tolerance?: number } = {},
): Promise<RemoveSpriteBackgroundResult> {
  const removeBackground = options.removeBackground ?? true;
  const trim = options.trim ?? true;
  const tolerance = options.tolerance ?? 32;

  let currentSrc = src;
  let { data, width, height } = await loadImageDataFromSrc(currentSrc);

  if (removeBackground && shouldAutoRemoveSpriteBackground(data.data, width, height, tolerance)) {
    const keyed = await removeSpriteSolidBackground(currentSrc, tolerance);
    return keyed;
  }

  if (trim) {
    const trimmed = trimImageDataToOpaqueBounds(data);
    if (trimmed && (trimmed.width !== width || trimmed.height !== height)) {
      return {
        src: imageDataToPngSrc(trimmed),
        width: trimmed.width,
        height: trimmed.height,
      };
    }
  }

  return { src: currentSrc, width, height };
}

/**
 * Flood-fill solid background from image edges (typical white export plate).
 * Teacher Activity Builder only — runs in the browser on a canvas.
 */
export async function removeSpriteSolidBackground(
  src: string,
  tolerance = 32,
): Promise<RemoveSpriteBackgroundResult> {
  const image = await loadImage(src);
  const width = image.naturalWidth;
  const height = image.naturalHeight;
  if (width < 1 || height < 1) {
    throw new Error("Image has no pixels.");
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas unavailable");

  ctx.drawImage(image, 0, 0);
  const imageData = ctx.getImageData(0, 0, width, height);
  const bg = estimateBackgroundColor(imageData.data, width, height);
  keyOutBorderConnectedGutterInImageData(imageData, bg, tolerance);
  ctx.putImageData(imageData, 0, 0);

  const trimmed = trimImageDataToOpaqueBounds(imageData);
  if (trimmed && (trimmed.width !== width || trimmed.height !== height)) {
    return {
      src: imageDataToPngSrc(trimmed),
      width: trimmed.width,
      height: trimmed.height,
    };
  }

  return {
    src: canvas.toDataURL("image/png"),
    width,
    height,
  };
}

/** Returns true when corners look like a uniform solid plate worth auto-keying. */
export function shouldAutoRemoveSpriteBackground(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  tolerance = 32,
): boolean {
  if (width < 2 || height < 2) return false;
  const bg = estimateBackgroundColor(data, width, height);
  const corners = [
    [0, 0],
    [width - 1, 0],
    [0, height - 1],
    [width - 1, height - 1],
  ] as const;
  return corners.every(([x, y]) =>
    isBackgroundPixel(data, width, x, y, bg, tolerance),
  );
}

export async function loadImageDataFromSrc(
  src: string,
): Promise<{ data: ImageData; width: number; height: number }> {
  const image = await loadImage(src);
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.drawImage(image, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return { data: imageData, width: canvas.width, height: canvas.height };
}
