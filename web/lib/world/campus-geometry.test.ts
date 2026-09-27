import { describe, expect, it } from "vitest";
import {
  archPoints,
  circlePoints,
  createExtrudeGeometry,
  createLatheGeometry,
  ensureWinding,
  gableOutline,
  heartPoints,
  isClockwise,
  makeShape,
  rectPoints,
  roundedRectPoints,
  trianglePoints,
} from "@/components/world/campus/campus-geometry";

describe("campus geometry kit", () => {
  it("builds a gable with the peak on the centerline", () => {
    const outline = gableOutline(1.22, 0.12, 0.74, 0.48);
    expect(outline).toHaveLength(5);
    expect(outline[3][0]).toBe(0);
    expect(outline[3][1]).toBeCloseTo(1.34);
    expect(isClockwise(outline)).toBe(false);
  });

  it("reverses winding when asked", () => {
    const ccw = rectPoints(0, 0, 2, 2);
    expect(isClockwise(ccw)).toBe(false);
    expect(isClockwise(ensureWinding(ccw, true))).toBe(true);
  });

  it("puts an arched door hole inside a gable shape", () => {
    const shape = makeShape({
      outline: gableOutline(1.22, 0.12, 0.74, 0.48),
      holes: [
        archPoints(0, 0.12, 0.36, 0.52),
        circlePoints(0, 1.02, 0.09),
        rectPoints(-0.4, 0.5, 0.18, 0.2),
        rectPoints(0.4, 0.5, 0.18, 0.2),
      ],
    });
    expect(shape.holes).toHaveLength(4);
    const geometry = createExtrudeGeometry(
      {
        outline: gableOutline(1.22, 0.12, 0.74, 0.48),
        holes: [
          archPoints(0, 0.14, 0.36, 0.5),
          circlePoints(0, 1.02, 0.09),
          rectPoints(-0.4, 0.5, 0.18, 0.2),
          rectPoints(0.4, 0.5, 0.18, 0.2),
        ],
      },
      { depth: 0.1 },
    );
    expect(geometry.getAttribute("position").count).toBeGreaterThan(20);
    geometry.dispose();
  });

  it("traces a closed heart that is taller than it is wide", () => {
    const heart = heartPoints(0, 1, 0.16);
    expect(heart.length).toBeGreaterThan(12);
    const xs = heart.map((point) => point[0]);
    const ys = heart.map((point) => point[1]);
    const width = Math.max(...xs) - Math.min(...xs);
    const height = Math.max(...ys) - Math.min(...ys);
    expect(height).toBeGreaterThan(width);
  });

  it("lathes a bell profile into a solid", () => {
    const geometry = createLatheGeometry(
      [
        [0.01, 0],
        [0.06, 0.02],
        [0.05, 0.08],
        [0.02, 0.12],
      ],
      12,
    );
    expect(geometry.getAttribute("position").count).toBeGreaterThan(12);
    geometry.dispose();
  });

  it("builds a standing triangle and a rounded rect", () => {
    const triangle = trianglePoints(1, 0.4);
    expect(triangle).toHaveLength(3);
    expect(triangle[2]).toEqual([0, 0.4]);
    expect(isClockwise(triangle)).toBe(false);

    const round = roundedRectPoints(0, 0, 1, 0.6, 0.1, 3);
    expect(round.length).toBeGreaterThan(8);
    expect(isClockwise(round)).toBe(false);
    const geometry = createExtrudeGeometry({ outline: round }, { depth: 0.2 });
    expect(geometry.getAttribute("position").count).toBeGreaterThan(20);
    geometry.dispose();
  });
});
