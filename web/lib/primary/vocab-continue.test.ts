import { describe, expect, it } from "vitest";
import {
  listVocabSetsInMenuOrder,
  parseVocabSetIdFromLessonId,
  vocabPhaseFromResumeIndex,
  VOCAB_PHASE_LABELS,
} from "./vocab-continue";

describe("vocab-continue helpers", () => {
  it("parses vocab lesson ids", () => {
    expect(parseVocabSetIdFromLessonId("vocab-breakfast_food")).toBe("breakfast_food");
    expect(parseVocabSetIdFromLessonId("lesson-1")).toBeNull();
    expect(parseVocabSetIdFromLessonId("vocab-player-seed")).toBeNull();
  });

  it("maps resume index to Vocab Player phases", () => {
    // spine: 1 flash + 6 letter + 1 match + 6 mc + 6 listen
    expect(vocabPhaseFromResumeIndex(0)).toBe(0);
    expect(vocabPhaseFromResumeIndex(1)).toBe(1);
    expect(vocabPhaseFromResumeIndex(6)).toBe(1);
    expect(vocabPhaseFromResumeIndex(7)).toBe(2);
    expect(vocabPhaseFromResumeIndex(8)).toBe(3);
    expect(vocabPhaseFromResumeIndex(13)).toBe(3);
    expect(vocabPhaseFromResumeIndex(14)).toBe(4);
    expect(vocabPhaseFromResumeIndex(19)).toBe(4);
    expect(VOCAB_PHASE_LABELS).toEqual([
      "Flashcards",
      "Spell the word",
      "Match pictures",
      "Choose the word",
      "Listen and choose",
    ]);
  });

  it("lists menu sets with food first", () => {
    const order = listVocabSetsInMenuOrder();
    expect(order[0]).toBe("breakfast_food");
    expect(order).toContain("clothes_everyday");
    expect(order).toContain("toys_everyday");
  });
});
