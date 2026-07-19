import { distance, roundCoord } from "@/lib/whiteboard/coordinates";
import type { Point, ShapeElement, WhiteboardElement } from "@/lib/whiteboard/domain";

const MIN_DISTANCE = 2.5;
const MAX_POINTS = 400;

/** Drop near-duplicate points, round coords, and cap length. */
export function simplifyStroke(points: Point[]): Point[] {
  if (points.length <= 1) {
    return points.map((p) => ({
      x: roundCoord(p.x),
      y: roundCoord(p.y),
      ...(p.pressure != null ? { pressure: p.pressure } : {}),
    }));
  }

  const filtered: Point[] = [points[0]!];
  for (let i = 1; i < points.length; i += 1) {
    const prev = filtered[filtered.length - 1]!;
    const curr = points[i]!;
    if (distance(prev, curr) >= MIN_DISTANCE) {
      filtered.push(curr);
    }
  }

  const last = points[points.length - 1]!;
  const tail = filtered[filtered.length - 1]!;
  if (distance(tail, last) > 0.1) {
    filtered.push(last);
  }

  const rounded = filtered.map((p) => ({
    x: roundCoord(p.x),
    y: roundCoord(p.y),
    ...(p.pressure != null ? { pressure: Math.round(p.pressure * 100) / 100 } : {}),
  }));

  if (rounded.length <= MAX_POINTS) return rounded;

  const step = (rounded.length - 1) / (MAX_POINTS - 1);
  const downsampled: Point[] = [];
  for (let i = 0; i < MAX_POINTS; i += 1) {
    const index = Math.round(i * step);
    downsampled.push(rounded[index]!);
  }
  return downsampled;
}

/** Rough stroke hit-test for stroke eraser. */
export function strokeIntersectsPoint(
  points: Point[],
  point: Point,
  strokeWidth: number,
  eraserRadius = 14,
): boolean {
  const threshold = strokeWidth / 2 + eraserRadius;
  for (let i = 0; i < points.length; i += 1) {
    if (distance(points[i]!, point) <= threshold) return true;
  }
  for (let i = 1; i < points.length; i += 1) {
    if (distanceToSegment(point, points[i - 1]!, points[i]!) <= threshold) {
      return true;
    }
  }
  return false;
}

export function elementIntersectsPoint(el: WhiteboardElement, point: Point): boolean {
  if (el.type === "stroke") {
    return strokeIntersectsPoint(el.points, point, el.width);
  }
  if (el.type === "text") {
    return (
      point.x >= el.x - 8 &&
      point.x <= el.x + el.width &&
      point.y >= el.y - el.fontSize &&
      point.y <= el.y + 8
    );
  }
  if (el.type === "stamp") {
    return distance(point, { x: el.x, y: el.y }) <= el.size / 2 + 8;
  }
  return shapeIntersectsPoint(el, point);
}

function shapeIntersectsPoint(el: ShapeElement, point: Point): boolean {
  if (el.shape === "line") {
    return (
      distanceToSegment(point, { x: el.x, y: el.y }, { x: el.x + el.width, y: el.y + el.height }) <=
      el.strokeWidth / 2 + 12
    );
  }
  const x = Math.min(el.x, el.x + el.width);
  const y = Math.min(el.y, el.y + el.height);
  const w = Math.abs(el.width);
  const h = Math.abs(el.height);
  if (el.shape === "rect") {
    return point.x >= x && point.x <= x + w && point.y >= y && point.y <= y + h;
  }
  const cx = x + w / 2;
  const cy = y + h / 2;
  const nx = w === 0 ? 0 : (point.x - cx) / (w / 2);
  const ny = h === 0 ? 0 : (point.y - cy) / (h / 2);
  return nx * nx + ny * ny <= 1;
}

function distanceToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (dx === 0 && dy === 0) return distance(p, a);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)));
  return distance(p, { x: a.x + t * dx, y: a.y + t * dy });
}
