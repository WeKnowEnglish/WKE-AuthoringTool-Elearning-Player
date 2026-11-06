import { describe, expect, it } from "vitest";
import { chooseMemoryGridLayout } from "@/lib/word-games/memory-layout";

describe("chooseMemoryGridLayout", () => {
  it("keeps a ten-pair deck readable on a portrait screen", () => {
    expect(chooseMemoryGridLayout(20, 360, 500)).toEqual({
      columns: 3,
      rows: 7,
    });
  });

  it("uses a wider layout for the same deck on landscape screens", () => {
    expect(chooseMemoryGridLayout(20, 800, 400)).toEqual({
      columns: 5,
      rows: 4,
    });
  });

  it("allows vertical scrolling rather than narrow cards for large decks", () => {
    const layout = chooseMemoryGridLayout(24, 320, 700);
    expect(layout.columns * layout.rows).toBeGreaterThanOrEqual(24);
    expect(layout).toEqual({ columns: 3, rows: 8 });
  });

  it("reserves more width for definitions and example sentences", () => {
    expect(chooseMemoryGridLayout(12, 286, 300, 12, 128)).toEqual({ columns: 2, rows: 6 });
  });

  it("uses one column if the embed cannot fit two readable cards", () => {
    expect(chooseMemoryGridLayout(4, 180, 300, 12, 128)).toEqual({ columns: 1, rows: 4 });
  });
});
