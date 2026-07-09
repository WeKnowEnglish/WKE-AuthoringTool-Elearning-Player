import { describe, expect, it } from "vitest";
import {
  assembleClozeParagraph,
  buildClozeTitle,
  pickClozeItemsByTopic,
} from "@/lib/secondary/secondary-cloze-paragraph";
import type { SecondaryVocabItem } from "@/lib/secondary/types";

function makeItem(
  overrides: Partial<SecondaryVocabItem> & Pick<SecondaryVocabItem, "wordItemId" | "word" | "topicId">,
): SecondaryVocabItem {
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
    difficulty: overrides.difficulty ?? 2,
    practiceTypes: ["cloze"],
    tags: [],
    sentenceFrame: `We use ___ for ${overrides.word}.`,
    ...overrides,
  };
}

describe("secondary-cloze-paragraph", () => {
  it("adds connectives and capitalizes the opening clause", () => {
    const paragraph = assembleClozeParagraph([
      "my favorite ___ is science",
      "we looked at a map in ___",
      "finally we visited the ___",
    ]);
    expect(paragraph).toBe(
      "My favorite ___ is science. Then we looked at a map in ___. Also, we visited the ___.",
    );
  });

  it("builds a topic title for single-topic cloze", () => {
    expect(buildClozeTitle("school-life", false)).toContain("Cloze");
    expect(buildClozeTitle("school-life", true)).toBe("Today's Vocabulary Cloze");
  });

  it("picks blanks from one topic when enough words share a topic", () => {
    const pool = [
      makeItem({ wordItemId: "a1", word: "library", topicId: "school-life", difficulty: 1 }),
      makeItem({ wordItemId: "a2", word: "science", topicId: "school-life", difficulty: 2 }),
      makeItem({ wordItemId: "a3", word: "homework", topicId: "school-life", difficulty: 3 }),
      makeItem({ wordItemId: "b1", word: "recipe", topicId: "food", difficulty: 2 }),
    ];

    const result = pickClozeItemsByTopic({
      pool,
      seed: "student:2026-07-04:cloze",
      minBlanks: 2,
      maxBlanks: 3,
    });

    expect(result).not.toBeNull();
    expect(result!.isMixedTopic).toBe(false);
    expect(result!.primaryTopicId).toBe("school-life");
    expect(result!.picked.every((item) => item.topicId === "school-life")).toBe(true);
    expect(result!.picked.map((item) => item.difficulty)).toEqual([1, 2, 3]);
  });

  it("uses a two-topic fallback when no single topic has enough words", () => {
    const pool = [
      makeItem({ wordItemId: "a1", word: "library", topicId: "school-life" }),
      makeItem({ wordItemId: "b1", word: "recipe", topicId: "food" }),
      makeItem({ wordItemId: "c1", word: "forest", topicId: "nature" }),
      makeItem({ wordItemId: "d1", word: "stadium", topicId: "sports" }),
    ];

    const result = pickClozeItemsByTopic({
      pool,
      seed: "student:2026-07-04:cloze",
      minBlanks: 2,
      maxBlanks: 4,
    });

    expect(result).not.toBeNull();
    expect(result!.isMixedTopic).toBe(true);
    expect(new Set(result!.picked.map((item) => item.topicId)).size).toBeGreaterThan(1);
  });
});
