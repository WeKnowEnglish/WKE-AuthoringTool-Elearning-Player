import { describe, expect, it } from "vitest";
import {
  VOCAB_LEARN_BORDER_SLOT,
  VOCAB_LEARN_CENTER_VOID,
  computeLearnBorderSlotCounts,
  layoutLearnBorderSlot,
  learnBorderSlotClearsCenterVoid,
} from "./vocab-learn-new-word";

describe("layoutLearnBorderSlot", () => {
  it("uses 4+2+4+2 distribution for twelve words", () => {
    expect(computeLearnBorderSlotCounts(12)).toEqual({
      top: 4,
      right: 2,
      bottom: 4,
      left: 2,
    });
  });

  it("places twelve breakfast shadows around the border without overlapping the center void", () => {
    const rects = Array.from({ length: 12 }, (_, i) => layoutLearnBorderSlot(i, 12));

    for (const rect of rects) {
      expect(rect.w).toBe(VOCAB_LEARN_BORDER_SLOT.w);
      expect(rect.h).toBe(VOCAB_LEARN_BORDER_SLOT.h);
      expect(learnBorderSlotClearsCenterVoid(rect)).toBe(true);
    }

    const topYs = rects.slice(0, 4).map((r) => r.y);
    const bottomYs = rects.slice(6, 10).map((r) => r.y);
    expect(new Set(topYs).size).toBe(1);
    expect(new Set(bottomYs).size).toBe(1);
    expect(Math.min(...topYs)).toBeLessThan(VOCAB_LEARN_CENTER_VOID.y);
    expect(Math.min(...bottomYs)).toBeGreaterThan(
      VOCAB_LEARN_CENTER_VOID.y + VOCAB_LEARN_CENTER_VOID.h,
    );
  });

  it("returns unique positions for each index", () => {
    const rects = Array.from({ length: 12 }, (_, i) => layoutLearnBorderSlot(i, 12));
    const keys = rects.map((r) => `${r.x},${r.y}`);
    expect(new Set(keys).size).toBe(12);
  });
});
