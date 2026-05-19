import { describe, expect, it } from "vitest";
import {
  clientToImagePercents,
  containedImageRect,
  imagePercentToContainerPoint,
} from "@/lib/student-hub/sticker-scene-geometry";

describe("containedImageRect", () => {
  it("letterboxes a wide image in a tall box", () => {
    const r = containedImageRect(400, 300, 800, 400);
    expect(r.width).toBe(400);
    expect(r.height).toBe(200);
    expect(r.left).toBe(0);
    expect(r.top).toBe(50);
  });
});

describe("clientToImagePercents", () => {
  it("returns null outside the fitted image", () => {
    const rect = { left: 0, top: 0, width: 400, height: 300 };
    expect(clientToImagePercents(10, 10, rect, 800, 400)).toBeNull();
  });

  it("maps center of fitted image to 50%, 50%", () => {
    const rect = { left: 0, top: 0, width: 400, height: 300 };
    const pt = clientToImagePercents(200, 150, rect, 800, 400);
    expect(pt).toEqual({ xPercent: 50, yPercent: 50 });
  });
});

describe("imagePercentToContainerPoint", () => {
  it("inverts percent mapping within the container", () => {
    const pt = imagePercentToContainerPoint(50, 50, 400, 300, 800, 400);
    expect(pt).toEqual({ x: 200, y: 150 });
  });
});
