import type { PixelRect } from "./types";

export function maskBoundingBox(
  mask: Uint8Array,
  width: number,
  height: number,
  threshold = 128,
): PixelRect | null {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  let area = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if ((mask[y * width + x] ?? 0) < threshold) continue;
      area += 1;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (maxX < 0 || area === 0) return null;
  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

export function countMaskPixels(mask: Uint8Array, threshold = 128): number {
  let count = 0;
  for (let i = 0; i < mask.length; i++) {
    if ((mask[i] ?? 0) >= threshold) count += 1;
  }
  return count;
}
