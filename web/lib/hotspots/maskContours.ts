import { contoursToSvgPath as sharedContoursToSvgPath } from "@wke/explore-hotspots-play";
import type { NormalizedPoint } from "@/lib/hotspots/types";

type EdgeMap = Map<number, number[]>;

function polygonArea(points: NormalizedPoint[]): number {
  let area = 0;
  for (let index = 0; index < points.length; index++) {
    const current = points[index]!;
    const next = points[(index + 1) % points.length]!;
    area += current.x * next.y - next.x * current.y;
  }
  return area / 2;
}

function simplifyByDistance(points: NormalizedPoint[], tolerance: number): NormalizedPoint[] {
  if (points.length <= 4 || tolerance <= 0) return points;
  const kept: NormalizedPoint[] = [points[0]!];
  let last = points[0]!;
  for (let index = 1; index < points.length; index++) {
    const point = points[index]!;
    if (Math.hypot(point.x - last.x, point.y - last.y) < tolerance) continue;
    kept.push(point);
    last = point;
  }
  return kept.length >= 3 ? kept : points;
}

/** Convert a binary SAM mask into normalized closed contours without creating another image asset. */
export function maskToNormalizedContours(
  mask: Uint8Array,
  width: number,
  height: number,
  options: { threshold?: number; simplifyTolerance?: number; minAreaFraction?: number } = {},
): NormalizedPoint[][] {
  if (width < 1 || height < 1 || mask.length < width * height) return [];
  const threshold = options.threshold ?? 128;
  const tolerance = options.simplifyTolerance ?? 0.0025;
  const minArea = options.minAreaFraction ?? 0.00004;
  const vertexWidth = width + 1;
  const edges: EdgeMap = new Map();
  const on = (x: number, y: number) => x >= 0 && y >= 0 && x < width && y < height && (mask[y * width + x] ?? 0) >= threshold;
  const vertex = (x: number, y: number) => y * vertexWidth + x;
  const addEdge = (from: number, to: number) => edges.set(from, [...(edges.get(from) ?? []), to]);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!on(x, y)) continue;
      if (!on(x, y - 1)) addEdge(vertex(x, y), vertex(x + 1, y));
      if (!on(x + 1, y)) addEdge(vertex(x + 1, y), vertex(x + 1, y + 1));
      if (!on(x, y + 1)) addEdge(vertex(x + 1, y + 1), vertex(x, y + 1));
      if (!on(x - 1, y)) addEdge(vertex(x, y + 1), vertex(x, y));
    }
  }

  const takeEdge = (from: number): number | null => {
    const candidates = edges.get(from);
    if (!candidates?.length) return null;
    const to = candidates.pop()!;
    if (!candidates.length) edges.delete(from);
    return to;
  };
  const decode = (key: number): NormalizedPoint => ({ x: (key % vertexWidth) / width, y: Math.floor(key / vertexWidth) / height });
  const contours: NormalizedPoint[][] = [];

  while (edges.size) {
    const start = edges.keys().next().value as number;
    const pathKeys = [start];
    let current = start;
    let guard = 0;
    while (guard++ < width * height * 8) {
      const next = takeEdge(current);
      if (next === null) break;
      if (next === start) break;
      pathKeys.push(next);
      current = next;
    }
    const points = simplifyByDistance(pathKeys.map(decode), tolerance);
    if (points.length >= 3 && Math.abs(polygonArea(points)) >= minArea) contours.push(points);
  }
  return contours.sort((a, b) => Math.abs(polygonArea(b)) - Math.abs(polygonArea(a)));
}

export function contoursToSvgPath(paths: NormalizedPoint[][], scale = 1000): string {
  return sharedContoursToSvgPath(paths, scale);
}
