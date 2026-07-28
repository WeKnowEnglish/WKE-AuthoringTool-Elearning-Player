import { describe, expect, it } from "vitest";
import {
  normalizedSpriteAspect,
  resizeRectangleWithAspect,
} from "./sprite-background";

describe("normalizedSpriteAspect", () => {
  it("accounts for scene media aspect when converting sprite pixels", () => {
    expect(normalizedSpriteAspect(400, 200, 1600, 900)).toBeCloseTo(1.125);
    expect(normalizedSpriteAspect(200, 400, 1600, 900)).toBeCloseTo(0.28125);
  });
});

describe("resizeRectangleWithAspect", () => {
  it("locks width when height drives the drag", () => {
    const rect = resizeRectangleWithAspect(
      { x: 0.2, y: 0.2 },
      { x: 0.8, y: 0.5 },
      2,
    );
    expect(rect.width / rect.height).toBeCloseTo(2, 4);
    expect(rect.x).toBeGreaterThanOrEqual(0);
    expect(rect.y).toBeGreaterThanOrEqual(0);
    expect(rect.x + rect.width).toBeLessThanOrEqual(1);
    expect(rect.y + rect.height).toBeLessThanOrEqual(1);
  });

  it("locks height when width drives the drag", () => {
    const rect = resizeRectangleWithAspect(
      { x: 0.1, y: 0.1 },
      { x: 0.9, y: 0.3 },
      0.5,
    );
    expect(rect.width / rect.height).toBeCloseTo(0.5, 4);
  });
});
