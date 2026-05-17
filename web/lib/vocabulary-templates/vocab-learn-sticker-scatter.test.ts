import { describe, expect, it } from "vitest";
import {
  VOCAB_LEARN_CENTER_VOID,
  learnBorderLayoutForWordId,
} from "./vocab-learn-new-word";
import {
  allStickerWordsMatched,
  scatterLearnStickerPositions,
  stickerImageHitsShadow,
} from "./vocab-learn-sticker-scatter";

const WORDS = ["bread", "milk", "juice", "eggs"];

describe("vocab learn sticker scatter", () => {
  it("differs scatter layout for different seeds", () => {
    const ids = WORDS.map((w) => `learn-${w}-img`);
    const a = scatterLearnStickerPositions(ids, WORDS, "session-a:sticker-scatter");
    const b = scatterLearnStickerPositions(ids, WORDS, "session-b:sticker-scatter");
    const aKey = ids.map((id) => `${a[id]!.x_percent},${a[id]!.y_percent}`).join("|");
    const bKey = ids.map((id) => `${b[id]!.x_percent},${b[id]!.y_percent}`).join("|");
    expect(aKey).not.toBe(bKey);
  });

  it("places scattered images inside the center void", () => {
    const ids = WORDS.map((w) => `learn-${w}-img`);
    const pos = scatterLearnStickerPositions(ids, WORDS, "scatter-test");
    expect(Object.keys(pos)).toHaveLength(4);
    const voidR = VOCAB_LEARN_CENTER_VOID;
    for (const id of ids) {
      const p = pos[id]!;
      expect(p.x_percent).toBeGreaterThanOrEqual(voidR.x);
      expect(p.y_percent).toBeGreaterThanOrEqual(voidR.y);
      expect(p.x_percent).toBeLessThan(voidR.x + voidR.w);
      expect(p.y_percent).toBeLessThan(voidR.y + voidR.h);
    }
  });

  it("detects drop on the matching shadow only", () => {
    const breadSlot = learnBorderLayoutForWordId("bread", WORDS);
    const pos = { x_percent: breadSlot.x, y_percent: breadSlot.y };
    expect(stickerImageHitsShadow(pos, breadSlot.w, breadSlot.h, "bread", WORDS)).toBe(
      true,
    );
    expect(stickerImageHitsShadow(pos, breadSlot.w, breadSlot.h, "milk", WORDS)).toBe(
      false,
    );
  });

  it("tracks when all words are matched", () => {
    expect(allStickerWordsMatched(WORDS, {})).toBe(false);
    expect(
      allStickerWordsMatched(WORDS, { bread: true, milk: true, juice: true, eggs: true }),
    ).toBe(true);
  });
});
