import { describe, expect, it } from "vitest";
import {
  buildClozeDistractorPool,
  buildSecondaryClozeWordBank,
  SECONDARY_CLOZE_MAX_DISTRACTORS,
} from "@/lib/secondary/secondary-cloze-distractors";
import { getAllSecondaryVocabItems } from "@/lib/secondary/secondary-vocab-bank";
import { getCompleteSecondaryVocabPack } from "@/lib/secondary/secondary-vocab-pack-loader";
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
    difficulty: 2,
    practiceTypes: ["cloze"],
    tags: [],
    ...overrides,
  };
}

describe("secondary-cloze-distractors", () => {
  it("dedupes distractors and excludes correct answers", () => {
    const picked = [
      makeItem({
        wordItemId: "a1",
        word: "library",
        topicId: "school-life",
        distractors: ["classroom", "library"],
        relatedWords: ["book", "classroom"],
      }),
      makeItem({
        wordItemId: "a2",
        word: "science",
        topicId: "school-life",
        distractors: ["math"],
        relatedWords: ["experiment"],
      }),
    ];
    const sessionPool = [
      ...picked,
      makeItem({ wordItemId: "a3", word: "homework", topicId: "school-life" }),
      makeItem({ wordItemId: "b1", word: "recipe", topicId: "food" }),
    ];

    const pool = buildClozeDistractorPool({ picked, sessionPool });
    expect(pool).not.toContain("library");
    expect(pool).not.toContain("science");
    expect(pool).toContain("classroom");
    expect(pool).toContain("book");
    expect(pool).toContain("homework");
    expect(pool).not.toContain("recipe");
    expect(pool.length).toBeLessThanOrEqual(SECONDARY_CLOZE_MAX_DISTRACTORS);
  });

  it("caps the distractor pool at eight words", () => {
    const picked = [
      makeItem({
        wordItemId: "a1",
        word: "library",
        topicId: "school-life",
        distractors: ["a", "b", "c", "d", "e", "f", "g", "h", "i"],
      }),
    ];
    const sessionPool = [
      ...picked,
      ...["j", "k", "l"].map((word, index) =>
        makeItem({ wordItemId: `x${index}`, word, topicId: "school-life" }),
      ),
    ];

    expect(buildClozeDistractorPool({ picked, sessionPool }).length).toBe(SECONDARY_CLOZE_MAX_DISTRACTORS);
  });

  it("shuffles answers with distractors instead of listing answers first", () => {
    const picked = getAllSecondaryVocabItems(getCompleteSecondaryVocabPack()).slice(0, 3);
    const answerWords = picked.map((item) => item.word);

    const bank = buildSecondaryClozeWordBank({
      blankWordItemIds: picked.map((item) => item.wordItemId),
      distractorWords: ["alpha", "beta", "gamma", "delta"],
      seed: "cloze-daily-v3-2026-07-10-r0",
    });

    expect(bank).toHaveLength(7);
    for (const word of answerWords) {
      expect(bank).toContain(word);
    }
    expect(bank).toContain("alpha");
    expect(bank.slice(0, 3)).not.toEqual(answerWords);
  });

  it("keeps word bank order stable for the same run seed", () => {
    const picked = getAllSecondaryVocabItems(getCompleteSecondaryVocabPack()).slice(0, 2);
    const input = {
      blankWordItemIds: picked.map((item) => item.wordItemId),
      distractorWords: ["alpha", "beta", "gamma"],
      seed: "cloze-daily-v3-2026-07-10-r1",
    };

    expect(buildSecondaryClozeWordBank(input)).toEqual(buildSecondaryClozeWordBank(input));
  });
});
