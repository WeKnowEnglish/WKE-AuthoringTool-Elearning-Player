import type { NormalizedPoint } from "./types";

/** Convert normalized contour paths into a single SVG path `d` string. */
export function contoursToSvgPath(paths: NormalizedPoint[][], scale = 1000): string {
  return paths
    .map((points) =>
      points.length < 3
        ? ""
        : `${points
            .map(
              (point, index) =>
                `${index === 0 ? "M" : "L"}${(point.x * scale).toFixed(2)} ${(point.y * scale).toFixed(2)}`,
            )
            .join(" ")} Z`,
    )
    .filter(Boolean)
    .join(" ");
}
