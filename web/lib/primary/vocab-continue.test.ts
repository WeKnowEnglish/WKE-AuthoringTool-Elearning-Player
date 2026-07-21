import { describe, expect, it } from "vitest";
import {
  listVocabSetsInMenuOrder,
  parseVocabSetIdFromLessonId,
  vocabPhaseFromResumeIndex,
} from "./vocab-continue";

describe("vocab-continue helpers", () => {
  it("parses vocab lesson ids", () => {
    expect(parseVocabSetIdFromLessonId("vocab-breakfast_food")).toBe("breakfast_food");
    expect(parseVocabSetIdFromLessonId("lesson-1")).toBeNull();
  });

  it("maps resume index to learner phases", () => {
    expect(vocabPhaseFromResumeIndex(0)).toBe(0);
    expect(vocabPhaseFromResumeIndex(1)).toBe(0);
    expect(vocabPhaseFromResumeIndex(2)).toBe(1);
    expect(vocabPhaseFromResumeIndex(8)).toBe(2);
    expect(vocabPhaseFromResumeIndex(9)).toBe(3);
    expect(vocabPhaseFromResumeIndex(15)).toBe(4);
  });

  it("lists menu sets with food first", () => {
    const order = listVocabSetsInMenuOrder();
    expect(order[0]).toBe("breakfast_food");
    expect(order).toContain("clothes_everyday");
    expect(order).toContain("toys_everyday");
  });
});
