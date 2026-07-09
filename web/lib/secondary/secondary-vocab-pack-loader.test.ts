import { describe, expect, it } from "vitest";
import {
  countSecondaryActivityEligibleWords,
  filterWordItemIdsForSecondaryActivity,
} from "@/lib/secondary/secondary-practice-types";
import {
  getAllSecondaryWordItemIds,
  getDefaultSecondaryVocabPack,
  getMvpSecondaryVocabPack,
  getSecondaryVocabItemById,
  SECONDARY_VOCAB_PACK_ID,
  SECONDARY_VOCAB_PACK_ITEM_COUNT,
  SECONDARY_VOCAB_PACK_VERSION,
} from "@/lib/secondary/secondary-vocab-bank";
import {
  collectSecondaryVocabPackValidationIssues,
  getCompleteSecondaryVocabPack,
  normalizeSecondaryPartOfSpeech,
  normalizeSecondaryVocabItem,
  parseSecondaryVocabPack,
  validateSecondaryVocabPack,
} from "@/lib/secondary/secondary-vocab-pack-loader";

describe("secondary-vocab-pack-loader", () => {
  it("loads the complete A2 pack with 240 unique wordItemIds", () => {
    const pack = getCompleteSecondaryVocabPack();

    expect(pack.metadata.packId).toBe(SECONDARY_VOCAB_PACK_ID);
    expect(pack.metadata.version).toBe(SECONDARY_VOCAB_PACK_VERSION);
    expect(pack.topics.length).toBeGreaterThan(0);
    expect(getAllSecondaryWordItemIds(pack)).toHaveLength(SECONDARY_VOCAB_PACK_ITEM_COUNT);
    expect(new Set(getAllSecondaryWordItemIds(pack)).size).toBe(SECONDARY_VOCAB_PACK_ITEM_COUNT);
  });

  it("passes validation for the complete pack", () => {
    expect(() => validateSecondaryVocabPack(getCompleteSecondaryVocabPack())).not.toThrow();
    expect(collectSecondaryVocabPackValidationIssues(getCompleteSecondaryVocabPack())).toEqual([]);
  });

  it("normalizes non-canonical partOfSpeech values", () => {
    expect(normalizeSecondaryPartOfSpeech("phrasal verb")).toBe("phrase");
    expect(normalizeSecondaryPartOfSpeech("noun phrase")).toBe("phrase");
    expect(normalizeSecondaryPartOfSpeech("conjunction")).toBe("phrase");
    expect(normalizeSecondaryPartOfSpeech("noun")).toBe("noun");
  });

  it("normalizes a raw item into SecondaryVocabItem shape", () => {
    const item = normalizeSecondaryVocabItem({
      wordItemId: "g7-a2-test-word",
      topicId: "school-life",
      setId: "subjects-places-and-people",
      word: "subject",
      partOfSpeech: "phrasal verb",
      cefrLevel: "A2",
      gradeBand: "6-7",
      studentMeaningEn: "an area of study",
      vnMeaning: "mon hoc",
      exampleSentence: "Science is my favorite subject.",
      difficulty: 2,
      practiceTypes: ["matching", "spelling"],
      tags: ["school"],
      spellingSupport: {
        syllables: ["sub", "ject"],
        commonMistakes: ["subjet"],
      },
    });

    expect(item.partOfSpeech).toBe("phrase");
    expect(item.packId).toBe(SECONDARY_VOCAB_PACK_ID);
    expect(item.practiceTypes).toEqual(["matching", "spelling"]);
    expect(item.spellingSupport).toEqual({
      syllables: ["sub", "ject"],
      commonMistakes: ["subjet"],
    });
  });

  it("loads spellingSupport from the complete pack", () => {
    const item = getCompleteSecondaryVocabPack().topics
      .flatMap((topic) => topic.sets)
      .flatMap((set) => set.items)
      .find((entry) => entry.wordItemId === "g7-a2-school-life-subject");

    expect(item?.spellingSupport?.syllables).toEqual(["sub", "ject"]);
    expect(item?.spellingSupport?.commonMistakes).toContain("subjet");
  });

  it("reports validation issues for malformed packs", () => {
    const badPack = parseSecondaryVocabPack({
      metadata: {
        packId: "wrong-pack",
        title: "Bad",
        description: "Bad",
        cefrLevel: "A2",
        gradeBand: "6-7",
        version: "0.0.1",
      },
      topics: [
        {
          topicId: "t",
          title: "T",
          sets: [
            {
              setId: "s",
              title: "S",
              items: [
                {
                  wordItemId: "dup",
                  topicId: "t",
                  setId: "s",
                  word: "one",
                  partOfSpeech: "noun",
                  cefrLevel: "A2",
                  gradeBand: "6-7",
                  studentMeaningEn: "one",
                  vnMeaning: "one",
                  exampleSentence: "one",
                  difficulty: 1,
                  practiceTypes: [],
                },
                {
                  wordItemId: "dup",
                  topicId: "t",
                  setId: "s",
                  word: "two",
                  partOfSpeech: "noun",
                  cefrLevel: "A2",
                  gradeBand: "6-7",
                  studentMeaningEn: "two",
                  vnMeaning: "two",
                  exampleSentence: "two",
                  difficulty: 1,
                  practiceTypes: ["matching"],
                },
              ],
            },
          ],
        },
      ],
    });

    const issues = collectSecondaryVocabPackValidationIssues(badPack);
    expect(issues.some((issue) => issue.code === "pack_id_mismatch")).toBe(true);
    expect(issues.some((issue) => issue.code === "duplicate_word_item_id")).toBe(true);
    expect(issues.some((issue) => issue.code === "item_count_mismatch")).toBe(true);
  });
});

describe("secondary-vocab-bank", () => {
  it("uses the complete pack by default", () => {
    expect(getDefaultSecondaryVocabPack().metadata.packId).toBe(SECONDARY_VOCAB_PACK_ID);
    expect(getAllSecondaryWordItemIds()).toHaveLength(SECONDARY_VOCAB_PACK_ITEM_COUNT);
    expect(getSecondaryVocabItemById("g7-a2-school-life-subject")?.word).toBe("subject");
  });

  it("keeps the MVP fixture available for small-bank tests", () => {
    const mvpIds = getAllSecondaryWordItemIds(getMvpSecondaryVocabPack());
    expect(mvpIds).toHaveLength(10);
    expect(mvpIds).toContain("g7-a2-school-life-subject");
  });

  it("has broad activity coverage in the complete pack", () => {
    const ids = getAllSecondaryWordItemIds();
    expect(countSecondaryActivityEligibleWords(ids, "match")).toBe(SECONDARY_VOCAB_PACK_ITEM_COUNT);
    expect(countSecondaryActivityEligibleWords(ids, "cloze")).toBe(SECONDARY_VOCAB_PACK_ITEM_COUNT);
    expect(countSecondaryActivityEligibleWords(ids, "spelling")).toBeGreaterThanOrEqual(230);
    expect(filterWordItemIdsForSecondaryActivity(ids, "spelling").length).toBeGreaterThanOrEqual(230);
  });
});
