import { describe, expect, it } from "vitest";
import {
  normalizedSpriteAspect,
  resizeRectangleWithAspect,
  translateRectangle,
  trimImageDataToOpaqueBounds,
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

  it("caps oversized portrait resize to the scene limit", () => {
    const rect = resizeRectangleWithAspect(
      { x: 0.5, y: 0 },
      { x: 0.55, y: 1 },
      0.05,
    );
    expect(rect.height).toBeLessThanOrEqual(0.85);
    expect(rect.width / rect.height).toBeCloseTo(0.05, 2);
  });
});

describe("translateRectangle", () => {
  it("moves within scene bounds", () => {
    const moved = translateRectangle({ x: 0.2, y: 0.3, width: 0.2, height: 0.2 }, 0.1, 0.05);
    expect(moved.x).toBeCloseTo(0.3);
    expect(moved.y).toBeCloseTo(0.35);
    expect(moved.width).toBeCloseTo(0.2);
    expect(moved.height).toBeCloseTo(0.2);
  });
});

describe("trimImageDataToOpaqueBounds", () => {
  it.skipIf(typeof ImageData === "undefined")("crops transparent margins", () => {
    const imageData = new ImageData(4, 4);
    imageData.data.set([
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 255, 0, 0, 255, 255, 0, 0, 255, 0, 0, 0, 0,
      0, 0, 0, 0, 255, 0, 0, 255, 255, 0, 0, 255, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    ]);
    const trimmed = trimImageDataToOpaqueBounds(imageData)!;
    expect(trimmed.width).toBe(2);
    expect(trimmed.height).toBe(2);
  });
});
