import { describe, expect, it } from "vitest";
import { chooseMemoryGridLayout } from "@/lib/word-games/memory-layout";

describe("chooseMemoryGridLayout", () => {
  it("fits a ten-pair deck into a portrait screen without scrolling", () => {
    expect(chooseMemoryGridLayout(20, 360, 500)).toEqual({
      columns: 4,
      rows: 5,
    });
  });

  it("uses a wider layout for the same deck on landscape screens", () => {
    expect(chooseMemoryGridLayout(20, 800, 400)).toEqual({
      columns: 5,
      rows: 4,
    });
  });

  it("never creates more than six rows for supported deck sizes", () => {
    const layout = chooseMemoryGridLayout(24, 320, 700);
    expect(layout.columns * layout.rows).toBeGreaterThanOrEqual(24);
    expect(layout.rows).toBeLessThanOrEqual(6);
  });
});
