import type { HotspotGeometry, NormalizedPoint } from "./types";

export function normalizeRotationDeg(degrees: number): number {
  if (!Number.isFinite(degrees)) return 0;
  const wrapped = degrees % 360;
  return wrapped < 0 ? wrapped + 360 : wrapped;
}

/** Normalize to (-180, 180] for authoring controls. */
export function signedRotationDeg(degrees: number): number {
  const normalized = normalizeRotationDeg(degrees);
  return normalized > 180 ? normalized - 360 : normalized;
}

export function geometryCenter(geometry: HotspotGeometry): NormalizedPoint {
  if (geometry.shape === "rectangle") {
    return {
      x: geometry.x + geometry.width / 2,
      y: geometry.y + geometry.height / 2,
    };
  }
  if (geometry.shape === "ellipse") {
    return { x: geometry.cx, y: geometry.cy };
  }
  const xs = geometry.points.map((point) => point.x);
  const ys = geometry.points.map((point) => point.y);
  return {
    x: (Math.min(...xs) + Math.max(...xs)) / 2,
    y: (Math.min(...ys) + Math.max(...ys)) / 2,
  };
}

/** Rotate a point around an origin by clockwise degrees. */
export function rotatePointAround(
  point: NormalizedPoint,
  origin: NormalizedPoint,
  degrees: number,
): NormalizedPoint {
  const rad = (degrees * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = point.x - origin.x;
  const dy = point.y - origin.y;
  return {
    x: origin.x + dx * cos - dy * sin,
    y: origin.y + dx * sin + dy * cos,
  };
}

/** Map a scene point into the object's unrotated local frame. */
export function unrotatePointAround(
  point: NormalizedPoint,
  origin: NormalizedPoint,
  degrees: number,
): NormalizedPoint {
  return rotatePointAround(point, origin, -degrees);
}

export function rotationDegreesFromPointer(
  pointer: NormalizedPoint,
  center: NormalizedPoint,
): number {
  const radians = Math.atan2(pointer.y - center.y, pointer.x - center.x);
  // 0° = upright (pointing up from center).
  return signedRotationDeg((radians * 180) / Math.PI + 90);
}
