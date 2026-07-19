import { BOARD_HEIGHT, BOARD_WIDTH, type Point } from "@/lib/whiteboard/domain";

export function clientToLogical(
  clientX: number,
  clientY: number,
  svgRect: DOMRect,
): Point {
  const x = ((clientX - svgRect.left) / svgRect.width) * BOARD_WIDTH;
  const y = ((clientY - svgRect.top) / svgRect.height) * BOARD_HEIGHT;
  return {
    x: clamp(x, 0, BOARD_WIDTH),
    y: clamp(y, 0, BOARD_HEIGHT),
  };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function distance(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

export function pointsToPath(points: Point[]): string {
  if (points.length === 0) return "";
  const [first, ...rest] = points;
  let d = `M ${roundCoord(first!.x)} ${roundCoord(first!.y)}`;
  for (const p of rest) {
    d += ` L ${roundCoord(p.x)} ${roundCoord(p.y)}`;
  }
  return d;
}

export function roundCoord(n: number): number {
  return Math.round(n * 10) / 10;
}
