import { describe, expect, it } from "vitest";
import {
  pickPathPanelPlacement,
  rectsOverlap,
} from "@/lib/path-panel-avoidance";

function R(x: number, y: number, w: number, h: number): DOMRectReadOnly {
  return {
    x,
    y,
    width: w,
    height: h,
    left: x,
    top: y,
    right: x + w,
    bottom: y + h,
    toJSON: () => ({}),
  } as DOMRectReadOnly;
}

describe("rectsOverlap", () => {
  it("returns false for separated rects", () => {
    const a = R(0, 0, 10, 10);
    const b = R(20, 0, 10, 10);
    expect(rectsOverlap(a, b, 0)).toBe(false);
  });

  it("returns true when rects touch interior", () => {
    const a = R(0, 0, 10, 10);
    const b = R(5, 5, 10, 10);
    expect(rectsOverlap(a, b, 0)).toBe(true);
  });

  it("treats pad as expansion for overlap test", () => {
    const a = R(0, 0, 10, 10);
    const b = R(11, 0, 10, 10);
    expect(rectsOverlap(a, b, 0)).toBe(false);
    expect(rectsOverlap(a, b, 2)).toBe(true);
  });
});

describe("pickPathPanelPlacement", () => {
  it("returns tl when item is far from top-left panel", () => {
    const overlay = R(0, 0, 800, 500);
    const item = R(600, 400, 50, 50);
    const panelW = 200;
    const panelH = 120;
    expect(
      pickPathPanelPlacement(overlay, item, panelW, panelH, 8),
    ).toBe("tl");
  });

  it("picks another corner when item overlaps tl panel slot", () => {
    const overlay = R(0, 0, 400, 250);
    const inset = 8;
    const panelW = 180;
    const panelH = 100;
    const item = R(overlay.left + inset + 10, overlay.top + inset + 10, 100, 80);
    const p = pickPathPanelPlacement(overlay, item, panelW, panelH, 8);
    expect(p).not.toBe("tl");
    expect(["tr", "bl", "br", "strip"]).toContain(p);
  });
});
