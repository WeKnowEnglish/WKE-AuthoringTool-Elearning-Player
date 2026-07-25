import type { WkeHotspotGeometry, WkePoint } from "@/lib/wke-activity/types";

/** Axis-aligned bounds in normalized 0–1 space. */
export type NormalizedBounds = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export function polygonBounds(points: WkePoint[]): NormalizedBounds {
  if (points.length === 0) {
    return { x: 0, y: 0, w: 0, h: 0 };
  }
  let minX = points[0]!.x;
  let maxX = points[0]!.x;
  let minY = points[0]!.y;
  let maxY = points[0]!.y;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  return {
    x: minX,
    y: minY,
    w: Math.max(0, maxX - minX),
    h: Math.max(0, maxY - minY),
  };
}

/** Ray-cast point-in-polygon. Coordinates are normalized 0–1. */
export function pointInPolygon(point: WkePoint, polygon: WkePoint[]): boolean {
  if (polygon.length < 3) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const pi = polygon[i]!;
    const pj = polygon[j]!;
    const intersects =
      pi.y > point.y !== pj.y > point.y &&
      point.x < ((pj.x - pi.x) * (point.y - pi.y)) / (pj.y - pi.y + Number.EPSILON) + pi.x;
    if (intersects) inside = !inside;
  }
  return inside;
}

/** SVG polygon points attribute from normalized 0–1 coords in a 0–100 viewBox. */
export function polygonToSvgPoints(points: WkePoint[]): string {
  return points.map((p) => `${p.x * 100},${p.y * 100}`).join(" ");
}

/**
 * Convert Studio hotspot geometry into polygon hit points for Lesson Player.
 * Rectangles become 4 corners; ellipses become a coarse polygon approximation.
 */
export function geometryToHitPoints(geometry: WkeHotspotGeometry): WkePoint[] {
  if (geometry.shape === "polygon") {
    return geometry.points;
  }
  if (geometry.shape === "rectangle") {
    return [
      { x: geometry.x, y: geometry.y },
      { x: geometry.x + geometry.width, y: geometry.y },
      { x: geometry.x + geometry.width, y: geometry.y + geometry.height },
      { x: geometry.x, y: geometry.y + geometry.height },
    ];
  }
  const steps = 16;
  const points: WkePoint[] = [];
  for (let i = 0; i < steps; i += 1) {
    const angle = (i / steps) * Math.PI * 2;
    points.push({
      x: geometry.cx + Math.cos(angle) * geometry.rx,
      y: geometry.cy + Math.sin(angle) * geometry.ry,
    });
  }
  return points;
}
