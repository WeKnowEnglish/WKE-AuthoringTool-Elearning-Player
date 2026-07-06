import { describe, expect, it } from "vitest";
import {
  clampTileRect,
  columnStridePx,
  computeStackedSpritePlacement,
  formatTilePresetTs,
  rowStridePx,
} from "@/lib/topdown/stacked-individual-layout";

describe("stacked-individual-layout", () => {
  it("clamps tile rects inside the image", () => {
    expect(clampTileRect({ x: 900, y: 900, w: 200, h: 200 }, 1024, 1024)).toEqual({
      x: 824,
      y: 824,
      w: 200,
      h: 200,
    });
  });

  it("scales so footprint width maps to logical tile size", () => {
    const placement = computeStackedSpritePlacement(
      1024,
      1024,
      { x: 100, y: 50, w: 800, h: 600 },
      64,
    );
    expect(placement.scale).toBeCloseTo(64 / 800);
    expect(placement.displayW).toBe(Math.round(1024 * (64 / 800)));
    expect(placement.offsetX).toBeCloseTo(-100 * (64 / 800));
    expect(placement.offsetY).toBeCloseTo(-50 * (64 / 800));
  });

  it("computes row and column strides from overlap", () => {
    const layout = { logicalTilePx: 64, lipOverlapPx: 10, columnOverlapPx: 4 };
    expect(rowStridePx(layout)).toBe(54);
    expect(columnStridePx(layout)).toBe(60);
  });

  it("formats a paste-ready preset module", () => {
    const text = formatTilePresetTs({
      exportName: "GRASS_1_PRESET",
      id: "grass_1",
      label: "Grass 1",
      category: "grass",
      imageSrc: "/assets/tiles/grass-1.png",
      width: 1024,
      height: 1024,
      content: { x: 1, y: 2, w: 3, h: 4 },
      footprint: { x: 5, y: 6, w: 7, h: 8 },
      layout: { logicalTilePx: 64, lipOverlapPx: 10, columnOverlapPx: 0 },
    });
    expect(text).toContain("export const GRASS_1_PRESET");
    expect(text).toContain("lipOverlapPx: 10");
    expect(text).toContain("footprint: { x: 5, y: 6, w: 7, h: 8 }");
    expect(text).not.toContain("imageScale");
  });
});
