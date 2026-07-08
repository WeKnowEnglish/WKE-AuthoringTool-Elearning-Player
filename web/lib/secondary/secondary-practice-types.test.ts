import { describe, expect, it } from "vitest";
import {
  filterWordItemIdsForSecondaryActivity,
  normalizeSecondaryPracticeType,
  normalizeSecondaryPracticeTypes,
  wordItemSupportsSecondaryActivity,
} from "@/lib/secondary/secondary-practice-types";
import type { SecondaryVocabItem } from "@/lib/secondary/types";

function item(practiceTypes: string[]): SecondaryVocabItem {
  return {
    wordItemId: "test-word",
    packId: "p",
    topicId: "t",
    setId: "s",
    word: "test",
    lemma: "test",
    partOfSpeech: "noun",
    cefrLevel: "A2",
    gradeBand: "7",
    studentMeaningEn: "a test",
    vnMeaning: "test",
    exampleSentence: "This is a test.",
    difficulty: 1,
    practiceTypes,
    tags: [],
  };
}

describe("secondary-practice-types", () => {
  it("normalizes bank aliases", () => {
    expect(normalizeSecondaryPracticeType("match")).toBe("matching");
    expect(normalizeSecondaryPracticeType("cloze")).toBe("cloze_paragraph");
    expect(normalizeSecondaryPracticeType("meaningChoice")).toBe("meaning_choice");
    expect(normalizeSecondaryPracticeTypes(["match", "matching"])).toEqual(["matching"]);
  });

  it("matches spelling-only words to spelling activity", () => {
    const spellingOnly = item(["spelling"]);
    expect(wordItemSupportsSecondaryActivity(spellingOnly, "spelling")).toBe(true);
    expect(wordItemSupportsSecondaryActivity(spellingOnly, "match")).toBe(false);
    expect(wordItemSupportsSecondaryActivity(spellingOnly, "cloze")).toBe(false);
  });

  it("allows meaning_choice for match activity", () => {
    const meaningOnly = item(["meaningChoice"]);
    expect(wordItemSupportsSecondaryActivity(meaningOnly, "match")).toBe(true);
  });

  it("treats fill_blank as cloze-eligible", () => {
    const fillBlank = item(["fillBlank"]);
    expect(wordItemSupportsSecondaryActivity(fillBlank, "cloze")).toBe(true);
  });
});
