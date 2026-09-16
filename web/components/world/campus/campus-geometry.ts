import { ExtrudeGeometry, LatheGeometry, Path, Shape, Vector2 } from "three";

export type Vec2 = readonly [number, number];

export type SilhouetteSpec = {
  outline: readonly Vec2[];
  holes?: readonly (readonly Vec2[])[];
};

export type ExtrudeSettings = {
  depth?: number;
  bevel?: boolean;
  bevelSize?: number;
};

function signedArea(points: readonly Vec2[]): number {
  let area = 0;
  for (let i = 0; i < points.length; i += 1) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    area += x1 * y2 - x2 * y1;
  }
  return area / 2;
}

/** Clockwise if signed area is negative (Y-up, X-right). */
export function isClockwise(points: readonly Vec2[]): boolean {
  return signedArea(points) < 0;
}

export function ensureWinding(points: readonly Vec2[], clockwise: boolean): Vec2[] {
  const copy = points.map((point) => [point[0], point[1]] as Vec2);
  if (copy.length < 3) return copy;
  if (isClockwise(copy) === clockwise) return copy;
  return copy.reverse();
}

function dropClosingDuplicate(points: readonly Vec2[]): Vec2[] {
  if (points.length < 2) return points.map((point) => [point[0], point[1]] as Vec2);
  const first = points[0];
  const last = points[points.length - 1];
  const same = Math.abs(first[0] - last[0]) < 1e-8 && Math.abs(first[1] - last[1]) < 1e-8;
  const trimmed = same ? points.slice(0, -1) : points;
  return trimmed.map((point) => [point[0], point[1]] as Vec2);
}

function applyPoints(path: Shape | Path, points: readonly Vec2[]) {
  const verts = dropClosingDuplicate(points);
  if (verts.length === 0) return;
  path.moveTo(verts[0][0], verts[0][1]);
  for (let i = 1; i < verts.length; i += 1) {
    path.lineTo(verts[i][0], verts[i][1]);
  }
  path.closePath();
}

/** Outer CCW, holes CW — what ExtrudeGeometry triangulates cleanly. */
export function makeShape(spec: SilhouetteSpec): Shape {
  const shape = new Shape();
  applyPoints(shape, ensureWinding(spec.outline, false));
  for (const hole of spec.holes ?? []) {
    const path = new Path();
    applyPoints(path, ensureWinding(hole, true));
    shape.holes.push(path);
  }
  return shape;
}

export function createExtrudeGeometry(spec: SilhouetteSpec, settings: ExtrudeSettings = {}): ExtrudeGeometry {
  const depth = settings.depth ?? 0.08;
  const bevel = settings.bevel ?? false;
  const bevelSize = settings.bevelSize ?? 0.012;
  return new ExtrudeGeometry(makeShape(spec), {
    depth,
    bevelEnabled: bevel,
    bevelThickness: bevel ? bevelSize : 0,
    bevelSize: bevel ? bevelSize : 0,
    bevelSegments: bevel ? 1 : 0,
    steps: 1,
  });
}

export function createLatheGeometry(profile: readonly Vec2[], segments = 16): LatheGeometry {
  const points = profile.map((point) => new Vector2(Math.max(0, point[0]), point[1]));
  return new LatheGeometry(points, segments);
}

/** House/school front: rectangle + centered gable peak. Origin is world XY. */
export function gableOutline(width: number, baseY: number, wallHeight: number, gableHeight: number): Vec2[] {
  const half = width / 2;
  const wallTop = baseY + wallHeight;
  return [
    [-half, baseY],
    [half, baseY],
    [half, wallTop],
    [0, wallTop + gableHeight],
    [-half, wallTop],
  ];
}

export function rectPoints(cx: number, cy: number, width: number, height: number): Vec2[] {
  const halfW = width / 2;
  const halfH = height / 2;
  return [
    [cx - halfW, cy - halfH],
    [cx + halfW, cy - halfH],
    [cx + halfW, cy + halfH],
    [cx - halfW, cy + halfH],
  ];
}

export function circlePoints(cx: number, cy: number, radius: number, segments = 20): Vec2[] {
  const points: Vec2[] = [];
  for (let i = 0; i < segments; i += 1) {
    const angle = (i / segments) * Math.PI * 2;
    points.push([cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius]);
  }
  return points;
}

/** Door opening: rectangle with a semicircle cap. `height` is total, including the arch. */
export function archPoints(cx: number, bottomY: number, width: number, height: number, segments = 12): Vec2[] {
  const radius = width / 2;
  const springY = bottomY + height - radius;
  const left = cx - radius;
  const right = cx + radius;
  const points: Vec2[] = [
    [left, bottomY],
    [right, bottomY],
    [right, springY],
  ];
  for (let i = 1; i < segments; i += 1) {
    const angle = (i / segments) * Math.PI;
    points.push([cx + Math.cos(angle) * radius, springY + Math.sin(angle) * radius]);
  }
  points.push([left, springY]);
  return points;
}

/** Parametric heart, point up, centered on (cx, cy). `size` is roughly the height. */
export function heartPoints(cx: number, cy: number, size: number, segments = 28): Vec2[] {
  const points: Vec2[] = [];
  for (let i = 0; i < segments; i += 1) {
    const t = (i / segments) * Math.PI * 2;
    const x = 16 * Math.sin(t) ** 3;
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    points.push([cx + (x / 40) * size, cy + (y / 32) * size + size * 0.06]);
  }
  return points;
}

/** Isosceles triangle standing on its base, for roof prisms. */
export function trianglePoints(width: number, height: number): Vec2[] {
  const half = width / 2;
  return [
    [-half, 0],
    [half, 0],
    [0, height],
  ];
}

/** Rounded rectangle in XY, CCW. Used for clay boxes and window frames. */
export function roundedRectPoints(
  cx: number,
  cy: number,
  width: number,
  height: number,
  radius: number,
  segments = 3,
): Vec2[] {
  const halfW = width / 2;
  const halfH = height / 2;
  const rad = Math.max(0, Math.min(radius, halfW, halfH));
  if (rad === 0) return rectPoints(cx, cy, width, height);

  const left = cx - halfW;
  const right = cx + halfW;
  const bottom = cy - halfH;
  const top = cy + halfH;
  const points: Vec2[] = [];

  const corner = (ox: number, oy: number, start: number) => {
    for (let i = 0; i <= segments; i += 1) {
      const angle = start + (i / segments) * (Math.PI / 2);
      points.push([ox + Math.cos(angle) * rad, oy + Math.sin(angle) * rad]);
    }
  };

  corner(right - rad, bottom + rad, -Math.PI / 2);
  corner(right - rad, top - rad, 0);
  corner(left + rad, top - rad, Math.PI / 2);
  corner(left + rad, bottom + rad, Math.PI);
  return points;
}
