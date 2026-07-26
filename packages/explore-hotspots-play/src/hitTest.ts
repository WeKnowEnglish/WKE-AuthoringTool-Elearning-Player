import type { HotspotGeometry, NormalizedPoint, PlayHotspot } from "./types";

export function pointInPolygon(point: NormalizedPoint, polygon: NormalizedPoint[]): boolean {
  if (polygon.length < 3) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const pi = polygon[i]!;
    const pj = polygon[j]!;
    const intersects =
      pi.y > point.y !== pj.y > point.y &&
      point.x <
        ((pj.x - pi.x) * (point.y - pi.y)) / (pj.y - pi.y + Number.EPSILON) + pi.x;
    if (intersects) inside = !inside;
  }
  return inside;
}

/** True ellipse (not AABB). Rectangle uses inclusive edges. */
export function pointInHotspotGeometry(
  point: NormalizedPoint,
  geometry: HotspotGeometry,
): boolean {
  if (geometry.shape === "rectangle") {
    return (
      point.x >= geometry.x &&
      point.x <= geometry.x + geometry.width &&
      point.y >= geometry.y &&
      point.y <= geometry.y + geometry.height
    );
  }
  if (geometry.shape === "ellipse") {
    const rx = Math.max(geometry.rx, Number.EPSILON);
    const ry = Math.max(geometry.ry, Number.EPSILON);
    const dx = (point.x - geometry.cx) / rx;
    const dy = (point.y - geometry.cy) / ry;
    return dx * dx + dy * dy <= 1;
  }
  return pointInPolygon(point, geometry.points);
}

/**
 * Play hit policy: geometry is the forgiving click target.
 * Contours are display-only (spotlight / outline), including holes.
 */
export function pickHotspotId(
  point: NormalizedPoint,
  hotspots: readonly PlayHotspot[],
): string | null {
  for (let i = hotspots.length - 1; i >= 0; i -= 1) {
    const hotspot = hotspots[i]!;
    if (pointInHotspotGeometry(point, hotspot.geometry)) return hotspot.id;
  }
  return null;
}
