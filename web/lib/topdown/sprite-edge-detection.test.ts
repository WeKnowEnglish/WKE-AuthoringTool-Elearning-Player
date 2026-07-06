import { describe, expect, it } from "vitest";
import { edgeDetectOptionsForAtlas } from "@/lib/topdown/atlas-bounds-snap";
import { GARDEN_DETECT_OPTIONS } from "@/lib/topdown/garden-detect";
import {
  bboxOfContentInRect,
  detectBestSpriteBoundsAtPoint,
  detectGridCellBoundsAtPoint,
  detectSpriteBoundsAtPoint,
  estimateBackgroundColor,
  inflateSpriteBounds,
  isBackgroundRgb,
  isLetterFruitSheetBackground,
} from "@/lib/topdown/sprite-edge-detection";

function makeSheet(options: {
  width: number;
  height: number;
  bg: [number, number, number];
  tiles: { x: number; y: number; w: number; h: number; color: [number, number, number] }[];
}): Uint8ClampedArray {
  const data = new Uint8ClampedArray(options.width * options.height * 4);
  for (let y = 0; y < options.height; y++) {
    for (let x = 0; x < options.width; x++) {
      const i = (y * options.width + x) * 4;
      data[i] = options.bg[0];
      data[i + 1] = options.bg[1];
      data[i + 2] = options.bg[2];
      data[i + 3] = 255;
    }
  }

  for (const tile of options.tiles) {
    for (let y = tile.y; y < tile.y + tile.h; y++) {
      for (let x = tile.x; x < tile.x + tile.w; x++) {
        const i = (y * options.width + x) * 4;
        data[i] = tile.color[0];
        data[i + 1] = tile.color[1];
        data[i + 2] = tile.color[2];
        data[i + 3] = 255;
      }
    }
  }

  return data;
}

describe("sprite-edge-detection", () => {
  it("estimates dark gutter background from corners", () => {
    const data = makeSheet({
      width: 100,
      height: 100,
      bg: [58, 58, 58],
      tiles: [],
    });
    const bg = estimateBackgroundColor(data, 100, 100);
    expect(bg.r).toBeCloseTo(58, 0);
    expect(bg.g).toBeCloseTo(58, 0);
    expect(bg.b).toBeCloseTo(58, 0);
  });

  it("detects a square tile from a click inside it", () => {
    const data = makeSheet({
      width: 200,
      height: 200,
      bg: [58, 58, 58],
      tiles: [{ x: 20, y: 20, w: 88, h: 88, color: [80, 160, 80] }],
    });

    const rect = detectSpriteBoundsAtPoint(data, 200, 200, 64, 64);
    expect(rect).toEqual({ sx: 20, sy: 20, sw: 88, sh: 88 });
  });

  it("detects the second tile in a row", () => {
    const data = makeSheet({
      width: 220,
      height: 120,
      bg: [58, 58, 58],
      tiles: [
        { x: 20, y: 20, w: 88, h: 88, color: [80, 160, 80] },
        { x: 120, y: 20, w: 88, h: 88, color: [160, 80, 80] },
      ],
    });

    const rect = detectBestSpriteBoundsAtPoint(data, 220, 120, 164, 50);
    expect(rect).toEqual({ sx: 120, sy: 20, sw: 88, sh: 88 });
  });

  it("snaps to grid gutters for a 4-column sheet layout", () => {
    const data = makeSheet({
      width: 400,
      height: 120,
      bg: [58, 58, 58],
      tiles: [
        { x: 12, y: 12, w: 88, h: 88, color: [80, 160, 80] },
        { x: 108, y: 12, w: 88, h: 88, color: [90, 170, 90] },
        { x: 204, y: 12, w: 88, h: 88, color: [100, 180, 100] },
        { x: 300, y: 12, w: 88, h: 88, color: [110, 190, 110] },
      ],
    });

    expect(detectGridCellBoundsAtPoint(data, 400, 120, 150, 50)).toEqual({
      sx: 108,
      sy: 12,
      sw: 88,
      sh: 88,
    });
  });

  it("detects a 300px path cell from gutter lines", () => {
    const data = makeSheet({
      width: 400,
      height: 400,
      bg: [58, 58, 58],
      tiles: [{ x: 12, y: 12, w: 300, h: 300, color: [120, 90, 60] }],
    });

    const rect = detectBestSpriteBoundsAtPoint(data, 400, 400, 162, 162, {
      maxCellSize: 320,
      minSize: 200,
      gutterScanFullAxis: true,
      gutterRatio: 0.78,
    });
    expect(rect).toEqual({ sx: 12, sy: 12, sw: 300, sh: 300 });
  });

  it("rejects garden-sized sprites with default detect limits", () => {
    const data = makeSheet({
      width: 800,
      height: 800,
      bg: [58, 58, 58],
      tiles: [{ x: 18, y: 538, w: 210, h: 210, color: [100, 120, 200] }],
    });

    const rect = detectBestSpriteBoundsAtPoint(data, 800, 800, 123, 643);
    expect(rect).toBeNull();
  });

  it("detects garden-sized tool sprites via flood-fill from click", () => {
    const data = makeSheet({
      width: 800,
      height: 800,
      bg: [58, 58, 58],
      tiles: [{ x: 18, y: 538, w: 210, h: 210, color: [100, 120, 200] }],
    });

    const rect = detectBestSpriteBoundsAtPoint(
      data,
      800,
      800,
      123,
      643,
      GARDEN_DETECT_OPTIONS,
    );
    expect(rect).toEqual({ sx: 12, sy: 532, sw: 222, sh: 222 });
  });

  it("detects irregular sprite bounds from click (not grid gutters)", () => {
    const data = makeSheet({
      width: 600,
      height: 600,
      bg: [58, 58, 58],
      tiles: [],
    });
    // Organic blob — corners are background, center is filled
    const blob = { x: 40, y: 40, w: 220, h: 220, color: [90, 150, 70] as [number, number, number] };
    for (let y = blob.y; y < blob.y + blob.h; y++) {
      for (let x = blob.x; x < blob.x + blob.w; x++) {
        const dx = x - (blob.x + blob.w / 2);
        const dy = y - (blob.y + blob.h / 2);
        if (dx * dx + dy * dy > 95 * 95) continue;
        const i = (y * 600 + x) * 4;
        data[i] = blob.color[0];
        data[i + 1] = blob.color[1];
        data[i + 2] = blob.color[2];
      }
    }

    const rect = detectBestSpriteBoundsAtPoint(data, 600, 600, 150, 150, GARDEN_DETECT_OPTIONS);
    expect(rect).not.toBeNull();
    expect(rect!.sw).toBeGreaterThanOrEqual(192);
    expect(rect!.sh).toBeGreaterThanOrEqual(192);
    expect(rect!.sw).toBeLessThanOrEqual(232);
    expect(rect!.sh).toBeLessThanOrEqual(232);
  });

  it("inflates bounds within the sheet", () => {
    expect(inflateSpriteBounds({ sx: 20, sy: 30, sw: 100, sh: 80 }, 6, 200, 200)).toEqual({
      sx: 14,
      sy: 24,
      sw: 112,
      sh: 92,
    });
  });

  it("includes anti-alias fringe via boundsPadding without tighten", () => {
    const data = makeSheet({
      width: 120,
      height: 120,
      bg: [58, 58, 58],
      tiles: [{ x: 30, y: 30, w: 40, h: 40, color: [90, 150, 70] }],
    });
    // Grey-green fringe just outside the solid tile (simulates anti-alias)
    for (let x = 28; x <= 72; x++) {
      const i = (29 * 120 + x) * 4;
      data[i] = 70;
      data[i + 1] = 104;
      data[i + 2] = 64;
    }

    const tight = detectSpriteBoundsAtPoint(data, 120, 120, 50, 50);
    expect(tight).toEqual({ sx: 28, sy: 29, sw: 45, sh: 41 });

    const padded = detectBestSpriteBoundsAtPoint(data, 120, 120, 50, 50, {
      floodFillOnly: true,
      boundsPadding: 4,
      bgTolerance: 32,
      maxCellSize: 120,
    });
    expect(padded).toEqual({ sx: 24, sy: 25, sw: 53, sh: 49 });
  });

  it("bboxOfContentInRect finds all disconnected blobs in a scan rect", () => {
    const data = makeSheet({
      width: 200,
      height: 100,
      bg: [58, 58, 58],
      tiles: [
        { x: 20, y: 30, w: 15, h: 40, color: [200, 80, 60] },
        { x: 60, y: 30, w: 15, h: 40, color: [200, 80, 60] },
      ],
    });

    const bbox = bboxOfContentInRect(data, 200, 100, { sx: 0, sy: 0, sw: 200, sh: 100 });
    expect(bbox).toEqual({ sx: 20, sy: 30, sw: 55, sh: 40 });
  });

  it("wires garden atlas detect options", () => {
    expect(edgeDetectOptionsForAtlas("garden")).toEqual(GARDEN_DETECT_OPTIONS);
  });
});

describe("letter-fruit sheet background classification", () => {
  const bg = { r: 58, g: 58, b: 58 };
  const tolerance = 42;

  it("treats dark shadows and soil as content, not gutter", () => {
    expect(isLetterFruitSheetBackground(48, 40, 55, bg, tolerance)).toBe(false);
    expect(isLetterFruitSheetBackground(55, 48, 42, bg, tolerance)).toBe(false);
    expect(isLetterFruitSheetBackground(35, 50, 30, bg, tolerance)).toBe(false);
    expect(isBackgroundRgb(48, 40, 55, bg, tolerance)).toBe(true);
  });

  it("still keys bright neutral gutter pixels", () => {
    expect(isLetterFruitSheetBackground(58, 58, 58, bg, tolerance)).toBe(true);
    expect(isLetterFruitSheetBackground(62, 60, 56, bg, tolerance)).toBe(true);
  });

  it("bboxOfContentInRect includes dark shadow pixels with letter-fruit rule", () => {
    const data = makeSheet({
      width: 120,
      height: 100,
      bg: [58, 58, 58],
      tiles: [
        { x: 40, y: 30, w: 40, h: 40, color: [180, 90, 200] },
        { x: 42, y: 62, w: 36, h: 12, color: [48, 40, 55] },
      ],
    });

    const scanRect = { sx: 20, sy: 20, sw: 80, sh: 70 };
    const defaultBbox = bboxOfContentInRect(data, 120, 100, scanRect, {
      bgTolerance: tolerance,
      minSize: 8,
    });
    const letterFruitBbox = bboxOfContentInRect(data, 120, 100, scanRect, {
      bgTolerance: tolerance,
      minSize: 8,
      isBackground: isLetterFruitSheetBackground,
    });

    expect(defaultBbox).toEqual({ sx: 40, sy: 30, sw: 40, sh: 40 });
    expect(letterFruitBbox).toEqual({ sx: 40, sy: 30, sw: 40, sh: 44 });
  });

  it("flood-fill crosses connected dark shadows with letter-fruit rule", () => {
    const data = makeSheet({
      width: 120,
      height: 100,
      bg: [58, 58, 58],
      tiles: [
        { x: 40, y: 30, w: 40, h: 20, color: [180, 90, 200] },
        { x: 40, y: 50, w: 40, h: 10, color: [48, 40, 55] },
      ],
    });

    const clipRect = { sx: 20, sy: 20, sw: 80, sh: 70 };
    const defaultFill = detectSpriteBoundsAtPoint(data, 120, 100, 60, 40, {
      bgTolerance: 42,
      clipRect,
    });
    const letterFruitFill = detectSpriteBoundsAtPoint(data, 120, 100, 60, 40, {
      bgTolerance: 42,
      clipRect,
      isBackground: isLetterFruitSheetBackground,
    });

    expect(defaultFill).toEqual({ sx: 40, sy: 30, sw: 40, sh: 20 });
    expect(letterFruitFill).toEqual({ sx: 40, sy: 30, sw: 40, sh: 30 });
  });
});
