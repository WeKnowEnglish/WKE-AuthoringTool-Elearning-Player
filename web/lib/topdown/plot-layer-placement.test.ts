import { describe, expect, it } from "vitest";
import {
  anchorPositionInCell,
  computePlotFruitPlacement,
  fruitDisplaySize,
} from "@/lib/topdown/plot-layer-placement";

const CELL = 64;

describe("plot-layer-placement", () => {
  it("computes display size from crop and scale", () => {
    expect(fruitDisplaySize(100, 200, 0.5)).toEqual({
      displayW: 50,
      displayH: 100,
    });
  });

  it("pins bottom-center to cell bottom edge", () => {
    const pos = anchorPositionInCell(CELL, 40, 50, "bottom-center");
    expect(pos.x).toBe(12);
    expect(pos.y).toBe(14);
    expect(pos.x + 40).toBe(52);
    expect(pos.y + 50).toBe(64);
  });

  it("centers fruit in cell", () => {
    const pos = anchorPositionInCell(CELL, 40, 50, "center");
    expect(pos.x).toBe(12);
    expect(pos.y).toBe(7);
  });

  it("pins top-left to cell origin", () => {
    expect(anchorPositionInCell(CELL, 40, 50, "top-left")).toEqual({
      x: 0,
      y: 0,
    });
  });

  it("pins middle-right to cell right edge", () => {
    const pos = anchorPositionInCell(CELL, 40, 50, "middle-right");
    expect(pos.x).toBe(24);
    expect(pos.y).toBe(7);
    expect(pos.x + 40).toBe(64);
  });

  it("applies offsets after anchor", () => {
    const placement = computePlotFruitPlacement({
      cellPx: CELL,
      cropSw: 100,
      cropSh: 100,
      layer: {
        scale: 0.5,
        offsetX: 5,
        offsetY: -3,
        anchor: "top-left",
      },
    });
    expect(placement.left).toBe(5);
    expect(placement.top).toBe(-3);
    expect(placement.displayW).toBe(50);
    expect(placement.displayH).toBe(50);
  });

  it("bottom-center placement keeps fruit base on cell bottom", () => {
    const placement = computePlotFruitPlacement({
      cellPx: CELL,
      cropSw: 82,
      cropSh: 69,
      layer: {
        scale: 0.341,
        offsetX: 0,
        offsetY: 2,
        anchor: "bottom-center",
      },
    });
    expect(placement.top + placement.displayH).toBe(66);
  });
});
