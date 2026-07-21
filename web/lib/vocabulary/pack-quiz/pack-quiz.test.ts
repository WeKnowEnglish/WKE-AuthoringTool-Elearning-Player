import { describe, expect, it } from "vitest";
import {
  createPackQuizDraft,
  getPackQuizFormatMeta,
  packQuizFormatReadiness,
} from "@/lib/vocabulary/pack-quiz";

describe("pack quiz draft contract", () => {
  it("freezes word ids at draft creation", () => {
    const ids = ["pv_a", "pv_b", "tw_c"];
    const draft = createPackQuizDraft({
      packId: "pack-1",
      packTitle: "Pets",
      format: "multiple_choice",
      wordIds: ids,
    });
    expect(draft.wordIds).toEqual(ids);
    expect(draft.wordIds).not.toBe(ids);
    expect(draft.format).toBe("multiple_choice");
  });

  it("enforces MC minimum of 4 words", () => {
    expect(packQuizFormatReadiness("multiple_choice", 3).ok).toBe(false);
    expect(packQuizFormatReadiness("multiple_choice", 4).ok).toBe(true);
    expect(packQuizFormatReadiness("letter_scramble", 1).ok).toBe(true);
  });

  it("exposes format metadata for the picker", () => {
    expect(getPackQuizFormatMeta("true_false").label).toBe("True / False");
    expect(getPackQuizFormatMeta("sentence_scramble").implementedInSlice).toBe(4);
    expect(getPackQuizFormatMeta("multiple_choice").implementedInSlice).toBe(0);
  });
});
