import { describe, expect, it } from "vitest";
import { buildClozeClause } from "@/lib/secondary/secondary-cloze-clause";
import type { SecondaryVocabItem } from "@/lib/secondary/types";

function makeItem(overrides: Partial<SecondaryVocabItem> & Pick<SecondaryVocabItem, "wordItemId" | "word" | "topicId">): SecondaryVocabItem {
  return {
    packId: "pack",
    setId: "set",
    lemma: overrides.word,
    partOfSpeech: "noun",
    cefrLevel: "A2",
    gradeBand: "7",
    studentMeaningEn: "meaning",
    vnMeaning: "nghĩa",
    exampleSentence: `This is ${overrides.word}.`,
    difficulty: 2,
    practiceTypes: ["cloze"],
    tags: [],
    ...overrides,
  };
}

describe("secondary-cloze-clause", () => {
  it("normalizes sentenceFrame blanks to four underscores", () => {
    const item = makeItem({
      wordItemId: "w1",
      word: "library",
      topicId: "school-life",
      sentenceFrame: "I borrowed a book from the ___.",
    });
    expect(buildClozeClause(item)).toBe("I borrowed a book from the ____.");
  });

  it("replaces the target word in example sentences", () => {
    const item = makeItem({
      wordItemId: "w2",
      word: "science",
      topicId: "school-life",
      exampleSentence: "My favorite subject is science.",
    });
    expect(buildClozeClause(item)).toBe("My favorite subject is ____.");
  });

  it("falls back to a generic blank prompt when no frame or example match exists", () => {
    const item = makeItem({
      wordItemId: "w3",
      word: "xyz",
      topicId: "school-life",
      exampleSentence: "We went to class.",
      studentMeaningEn: "a test word",
    });
    expect(buildClozeClause(item)).toBe("We went to class (____).");
  });
});
