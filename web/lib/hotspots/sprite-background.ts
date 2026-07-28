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
  const anchorX = point.x < opposite.x ? opposite.x - width : opposite.x;
  const anchorY = point.y < opposite.y ? opposite.y - height : opposite.y;
  return {
    x: Math.max(0, Math.min(1 - width, anchorX)),
    y: Math.max(0, Math.min(1 - height, anchorY)),
    width: Math.min(width, 1),
    height: Math.min(height, 1),
  };
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
