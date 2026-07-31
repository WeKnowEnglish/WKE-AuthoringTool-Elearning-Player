import type { HotspotGeometry, NormalizedPoint, PlayHotspot } from "./types";
import { geometryCenter, normalizeRotationDeg, unrotatePointAround } from "./rotation";

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
  rotationDeg = 0,
): boolean {
  const degrees = normalizeRotationDeg(rotationDeg);
  const local =
    degrees === 0
      ? point
      : unrotatePointAround(point, geometryCenter(geometry), degrees);

  if (geometry.shape === "rectangle") {
    return (
      local.x >= geometry.x &&
      local.x <= geometry.x + geometry.width &&
      local.y >= geometry.y &&
      local.y <= geometry.y + geometry.height
    );
  }
  if (geometry.shape === "ellipse") {
    const rx = Math.max(geometry.rx, Number.EPSILON);
    const ry = Math.max(geometry.ry, Number.EPSILON);
    const dx = (local.x - geometry.cx) / rx;
    const dy = (local.y - geometry.cy) / ry;
    return dx * dx + dy * dy <= 1;
  }
  return pointInPolygon(local, geometry.points);
}

/**
 * Play hit policy: geometry is the forgiving click target.
 * Contours are display-only (spotlight / outline), including holes.
 * Prefer action objects (audio / dialogue / info / question) over silent
 * props when both contain the point, so PNG props with play-audio work.
 * Walk front → back by zIndex (higher first).
 */
export function pickHotspotId(
  point: NormalizedPoint,
  hotspots: readonly PlayHotspot[],
): string | null {
  const ordered = [...hotspots].sort((a, b) => {
    const az = a.zIndex ?? a.tabOrder ?? 0;
    const bz = b.zIndex ?? b.tabOrder ?? 0;
    return az - bz;
  });
  let actionHit: string | null = null;
  let silentHit: string | null = null;
  for (let i = ordered.length - 1; i >= 0; i -= 1) {
    const hotspot = ordered[i]!;
    if (!pointInHotspotGeometry(point, hotspot.geometry, hotspot.rotationDeg ?? 0)) {
      continue;
    }
    const kind =
      hotspot.interactionKind ??
      (hotspot.presentation === "sprite" ? "silent" : "dialogue");
    if (kind === "none") continue;
    if (kind === "silent") {
      if (!silentHit) silentHit = hotspot.id;
      continue;
    }
    if (!actionHit) actionHit = hotspot.id;
  }
  return actionHit ?? silentHit;
}
