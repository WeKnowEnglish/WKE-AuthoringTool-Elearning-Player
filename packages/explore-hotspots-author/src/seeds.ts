import type { HotspotGeometry, NormalizedPoint } from "./types";

export function hotspotGeometryBounds(geometry: HotspotGeometry): {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
} {
  if (geometry.shape === "rectangle") {
    return {
      x1: geometry.x,
      y1: geometry.y,
      x2: geometry.x + geometry.width,
      y2: geometry.y + geometry.height,
    };
  }
  if (geometry.shape === "ellipse") {
    return {
      x1: geometry.cx - geometry.rx,
      y1: geometry.cy - geometry.ry,
      x2: geometry.cx + geometry.rx,
      y2: geometry.cy + geometry.ry,
    };
  }
  const xs = geometry.points.map((point) => point.x);
  const ys = geometry.points.map((point) => point.y);
  return {
    x1: Math.min(...xs),
    y1: Math.min(...ys),
    x2: Math.max(...xs),
    y2: Math.max(...ys),
  };
}

function polygonMidpointAtY(points: NormalizedPoint[], y: number): NormalizedPoint | null {
  const intersections: number[] = [];
  for (let index = 0; index < points.length; index++) {
    const start = points[index]!;
    const end = points[(index + 1) % points.length]!;
    if ((start.y <= y && end.y > y) || (end.y <= y && start.y > y)) {
      const fraction = (y - start.y) / (end.y - start.y);
      intersections.push(start.x + (end.x - start.x) * fraction);
    }
  }
  intersections.sort((a, b) => a - b);
  if (intersections.length < 2) return null;
  let widestStart = intersections[0]!;
  let widestEnd = intersections[1]!;
  for (let index = 2; index + 1 < intersections.length; index += 2) {
    if (intersections[index + 1]! - intersections[index]! > widestEnd - widestStart) {
      widestStart = intersections[index]!;
      widestEnd = intersections[index + 1]!;
    }
  }
  return { x: (widestStart + widestEnd) / 2, y };
}

/** Default positive seeds along the geometry centerline (can land in holes for rings). */
export function hotspotGeometrySeedPoints(geometry: HotspotGeometry): NormalizedPoint[] {
  const bounds = hotspotGeometryBounds(geometry);
  const yFractions = [0.3, 0.52, 0.72];
  return yFractions.map((fraction) => {
    const y = bounds.y1 + (bounds.y2 - bounds.y1) * fraction;
    if (geometry.shape === "polygon") {
      return polygonMidpointAtY(geometry.points, y) ?? { x: (bounds.x1 + bounds.x2) / 2, y };
    }
    return {
      x: geometry.shape === "ellipse" ? geometry.cx : geometry.x + geometry.width / 2,
      y,
    };
  });
}

function isMaskOn(value: number | undefined): boolean {
  return typeof value === "number" && (value > 0.5 || value >= 128);
}

export function maskHitsNormalizedPoint(
  mask: Uint8Array,
  width: number,
  height: number,
  point: NormalizedPoint,
  radius = 3,
): boolean {
  const cx = Math.round(point.x * width);
  const cy = Math.round(point.y * height);
  for (let y = Math.max(0, cy - radius); y <= Math.min(height - 1, cy + radius); y++) {
    for (let x = Math.max(0, cx - radius); x <= Math.min(width - 1, cx + radius); x++) {
      if (isMaskOn(mask[y * width + x])) return true;
    }
  }
  return false;
}

/** Keep only seeds that land on (near) foreground after a draft mask. */
export function filterSeedsOnForeground(
  seeds: NormalizedPoint[],
  mask: Uint8Array,
  width: number,
  height: number,
  radius = 3,
): { kept: NormalizedPoint[]; dropped: NormalizedPoint[] } {
  const kept: NormalizedPoint[] = [];
  const dropped: NormalizedPoint[] = [];
  for (const seed of seeds) {
    if (maskHitsNormalizedPoint(mask, width, height, seed, radius)) kept.push(seed);
    else dropped.push(seed);
  }
  return { kept, dropped };
}

/**
 * Centroid of the largest foreground blob inside an optional normalized box.
 * Used when all auto seeds fell in a hole / background.
 */
export function findMaskRescueSeed(
  mask: Uint8Array,
  width: number,
  height: number,
  normalizedBox?: { x1: number; y1: number; x2: number; y2: number },
): NormalizedPoint | null {
  const x1 = normalizedBox ? Math.max(0, Math.floor(normalizedBox.x1 * width)) : 0;
  const y1 = normalizedBox ? Math.max(0, Math.floor(normalizedBox.y1 * height)) : 0;
  const x2 = normalizedBox ? Math.min(width, Math.ceil(normalizedBox.x2 * width)) : width;
  const y2 = normalizedBox ? Math.min(height, Math.ceil(normalizedBox.y2 * height)) : height;

  const labels = new Int32Array(width * height);
  const areas: number[] = [0];
  const sums: Array<{ sx: number; sy: number }> = [{ sx: 0, sy: 0 }];
  let componentCount = 0;
  const queue: number[] = [];

  for (let y = y1; y < y2; y++) {
    for (let x = x1; x < x2; x++) {
      const index = y * width + x;
      if (!isMaskOn(mask[index]) || labels[index]) continue;
      componentCount += 1;
      labels[index] = componentCount;
      queue.length = 0;
      queue.push(index);
      let area = 0;
      let sx = 0;
      let sy = 0;
      for (let cursor = 0; cursor < queue.length; cursor++) {
        const current = queue[cursor]!;
        area += 1;
        const cx = current % width;
        const cy = Math.floor(current / width);
        sx += cx;
        sy += cy;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (!dx && !dy) continue;
            const nx = cx + dx;
            const ny = cy + dy;
            if (nx < x1 || nx >= x2 || ny < y1 || ny >= y2) continue;
            const next = ny * width + nx;
            if (!isMaskOn(mask[next]) || labels[next]) continue;
            labels[next] = componentCount;
            queue.push(next);
          }
        }
      }
      areas[componentCount] = area;
      sums[componentCount] = { sx, sy };
    }
  }

  if (!componentCount) return null;
  let best = 1;
  for (let label = 2; label <= componentCount; label++) {
    if ((areas[label] ?? 0) > (areas[best] ?? 0)) best = label;
  }
  const sum = sums[best]!;
  const area = areas[best]!;
  if (!area) return null;

  // Centroid of a ring can fall in the hole — snap to nearest foreground pixel.
  const cx = Math.round(sum.sx / area);
  const cy = Math.round(sum.sy / area);
  if (labels[cy * width + cx] === best) {
    return { x: cx / width, y: cy / height };
  }

  let bestPixel: { x: number; y: number; dist: number } | null = null;
  for (let y = y1; y < y2; y++) {
    for (let x = x1; x < x2; x++) {
      if (labels[y * width + x] !== best) continue;
      const dist = (x - cx) * (x - cx) + (y - cy) * (y - cy);
      if (!bestPixel || dist < bestPixel.dist) bestPixel = { x, y, dist };
    }
  }
  if (!bestPixel) return null;
  return { x: bestPixel.x / width, y: bestPixel.y / height };
}
