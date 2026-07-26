import type { MaskPostprocessOptions, PixelPoint } from "./types";

function isMaskOn(value: number | undefined): boolean {
  return typeof value === "number" && (value > 0.5 || value >= 128);
}

/** Fill enclosed background blobs smaller than maxHoleArea (touches image edge = not a hole). */
export function fillSmallMaskHoles(
  source: Uint8Array,
  width: number,
  height: number,
  maxHoleArea: number,
): Uint8Array {
  const result = source.slice();
  if (maxHoleArea < 1 || width < 3 || height < 3) return result;
  const visited = new Uint8Array(width * height);
  const queue: number[] = [];
  for (let start = 0; start < result.length; start++) {
    if (result[start] || visited[start]) continue;
    visited[start] = 1;
    queue.length = 0;
    queue.push(start);
    let touchesEdge = false;
    for (let cursor = 0; cursor < queue.length; cursor++) {
      const current = queue[cursor]!;
      const x = current % width;
      const y = Math.floor(current / width);
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) touchesEdge = true;
      const neighbors = [current - width, current + 1, current + width, current - 1];
      for (let direction = 0; direction < neighbors.length; direction++) {
        if (
          (direction === 0 && y === 0) ||
          (direction === 1 && x === width - 1) ||
          (direction === 2 && y === height - 1) ||
          (direction === 3 && x === 0)
        ) {
          continue;
        }
        const next = neighbors[direction]!;
        if (result[next] || visited[next]) continue;
        visited[next] = 1;
        queue.push(next);
      }
    }
    if (!touchesEdge && queue.length <= maxHoleArea) {
      for (const index of queue) result[index] = 255;
    }
  }
  return result;
}

/** Zero out a disk around each exclude point so negatives survive postprocess. */
export function carveExcludePoints(
  source: Uint8Array,
  width: number,
  height: number,
  excludes: PixelPoint[],
  radius: number,
): Uint8Array {
  if (radius < 1 || !excludes.length) return source;
  const result = source.slice();
  const r2 = radius * radius;
  for (const point of excludes) {
    const cx = Math.round(point.x);
    const cy = Math.round(point.y);
    for (let y = Math.max(0, cy - radius); y <= Math.min(height - 1, cy + radius); y++) {
      for (let x = Math.max(0, cx - radius); x <= Math.min(width - 1, cx + radius); x++) {
        const dx = x - cx;
        const dy = y - cy;
        if (dx * dx + dy * dy > r2) continue;
        result[y * width + x] = 0;
      }
    }
  }
  return result;
}

/**
 * Hotspot-oriented mask cleanup after SAM component filtering.
 * Prefer skipping hole-fill when excludes are present so carved cavities stay open.
 */
export function postprocessHotspotMask(
  source: Uint8Array,
  width: number,
  height: number,
  prompts: PixelPoint[],
  options: MaskPostprocessOptions = {},
): Uint8Array {
  const excludes = prompts.filter((prompt) => prompt.label === 0);
  const hasExclude = excludes.length > 0;
  const fillSmallHoles = options.fillSmallHoles ?? !hasExclude;
  const excludeCarveRadius =
    options.excludeCarveRadius ??
    (hasExclude ? Math.max(6, Math.round(Math.min(width, height) * 0.012)) : 0);
  const maxHoleArea =
    options.maxHoleArea ?? Math.max(6, Math.min(96, Math.round(width * height * 0.0002)));

  let mask = source;
  if (excludeCarveRadius > 0 && excludes.length) {
    mask = carveExcludePoints(mask, width, height, excludes, excludeCarveRadius);
  }
  if (fillSmallHoles) {
    mask = fillSmallMaskHoles(mask, width, height, maxHoleArea);
  }
  return mask === source ? source.slice() : mask;
}

/** True when a binary mask has an enclosed background region (donut / hole). */
export function maskHasEnclosedHole(
  mask: Uint8Array,
  width: number,
  height: number,
): boolean {
  if (width < 3 || height < 3) return false;
  const visited = new Uint8Array(width * height);
  const queue: number[] = [];
  for (let start = 0; start < mask.length; start++) {
    if (isMaskOn(mask[start]) || visited[start]) continue;
    visited[start] = 1;
    queue.length = 0;
    queue.push(start);
    let touchesEdge = false;
    for (let cursor = 0; cursor < queue.length; cursor++) {
      const current = queue[cursor]!;
      const x = current % width;
      const y = Math.floor(current / width);
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) touchesEdge = true;
      const neighbors = [current - width, current + 1, current + width, current - 1];
      for (let direction = 0; direction < neighbors.length; direction++) {
        if (
          (direction === 0 && y === 0) ||
          (direction === 1 && x === width - 1) ||
          (direction === 2 && y === height - 1) ||
          (direction === 3 && x === 0)
        ) {
          continue;
        }
        const next = neighbors[direction]!;
        if (isMaskOn(mask[next]) || visited[next]) continue;
        visited[next] = 1;
        queue.push(next);
      }
    }
    if (!touchesEdge && queue.length > 0) return true;
  }
  return false;
}
