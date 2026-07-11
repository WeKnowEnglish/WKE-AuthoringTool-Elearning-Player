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

  it("meets the Phase 3 rich-language coverage gate for all 20 School Life words", () => {
    const schoolLife = getCompleteSecondaryVocabPack().topics.find(
      (topic) => topic.topicId === "school-life",
    );
    const items = schoolLife?.sets.flatMap((set) => set.items) ?? [];

    expect(items).toHaveLength(20);
    for (const item of items) {
      expect(item.examples?.length, `${item.word}: examples`).toBeGreaterThanOrEqual(2);
      expect(
        new Set(item.examples?.map((example) => example.purpose)).has("transfer"),
        `${item.word}: transfer example`,
      ).toBe(true);
      expect(item.usagePatterns?.length, `${item.word}: usage patterns`).toBeGreaterThanOrEqual(1);
      expect(item.productionPrompts?.length, `${item.word}: production prompts`).toBeGreaterThanOrEqual(1);
      expect(item.clozeContexts?.length, `${item.word}: cloze contexts`).toBeGreaterThanOrEqual(1);

      const shownTexts = new Set([
        item.exampleSentence.trim().toLowerCase(),
        item.sentenceFrame?.trim().toLowerCase(),
        ...(item.examples ?? []).map((example) => example.text.toLowerCase()),
      ]);
      for (const context of item.clozeContexts ?? []) {
        expect(shownTexts.has(context.text.toLowerCase()), `${item.word}: unseen cloze`).toBe(false);
      }
    }
  });

  it("tracks full-topic rich-language migration without counting partial drafts", () => {
    const pack = getCompleteSecondaryVocabPack();
    const completedTopicIds = pack.topics
      .filter((topic) =>
        topic.sets.flatMap((set) => set.items).every((item) =>
          (item.examples?.length ?? 0) >= 2 &&
          (item.usagePatterns?.length ?? 0) >= 1 &&
          (item.productionPrompts?.length ?? 0) >= 1 &&
          (item.clozeContexts?.length ?? 0) >= 1,
        ),
      )
      .map((topic) => topic.topicId);
    const enrichedItems = pack.topics
      .flatMap((topic) => topic.sets)
      .flatMap((set) => set.items)
      .filter((item) =>
        (item.examples?.length ?? 0) >= 2 &&
        (item.usagePatterns?.length ?? 0) >= 1 &&
        (item.productionPrompts?.length ?? 0) >= 1 &&
        (item.clozeContexts?.length ?? 0) >= 1,
      );

    expect(completedTopicIds).toEqual([
      "school-life",
      "daily-routines",
      "personality",
      "feelings-opinions",
      "food-health",
      "places-directions",
      "technology-online-life",
      "environment",
      "stories-past-events",
      "future-plans-jobs",
      "social-life-communication",
      "academic-classroom-language",
    ]);
    expect(enrichedItems).toHaveLength(240);
  });

  it("meets the rich-language quality gate across all 240 words", () => {
    const items = getCompleteSecondaryVocabPack().topics
      .flatMap((topic) => topic.sets)
      .flatMap((set) => set.items);

    expect(items).toHaveLength(240);
    for (const item of items) {
      expect(item.examples?.length, `${item.word}: examples`).toBeGreaterThanOrEqual(2);
      expect(
        new Set(item.examples?.map((example) => example.text.trim().toLowerCase())).size,
        `${item.word}: distinct examples`,
      ).toBeGreaterThanOrEqual(2);
      expect(item.usagePatterns?.length, `${item.word}: usage patterns`).toBeGreaterThanOrEqual(1);
      expect(item.productionPrompts?.length, `${item.word}: production prompts`).toBeGreaterThanOrEqual(1);
      expect(item.clozeContexts?.length, `${item.word}: cloze contexts`).toBeGreaterThanOrEqual(1);

      for (const prompt of item.productionPrompts ?? []) {
        expect(prompt.prompt.trim(), `${item.word}: prompt text`).not.toBe("");
        expect(prompt.modelAnswer.trim(), `${item.word}: prompt model answer`).not.toBe("");
      }

      const shownTexts = new Set([
        item.exampleSentence.trim().toLowerCase(),
        item.sentenceFrame?.trim().toLowerCase(),
        ...(item.examples ?? []).map((example) => example.text.trim().toLowerCase()),
      ]);
      for (const context of item.clozeContexts ?? []) {
        expect(context.text, `${item.word}: cloze blank`).toContain("____");
        expect(context.acceptableAnswers.length, `${item.word}: cloze answers`).toBeGreaterThanOrEqual(1);
        expect(shownTexts.has(context.text.trim().toLowerCase()), `${item.word}: unseen cloze`).toBe(false);
      }
    }
  });

  it("normalizes Phase 2 rich-language fields without changing legacy items", () => {
    const item = normalizeSecondaryVocabItem({
      wordItemId: "g7-a2-test-rich-subject",
      topicId: "school-life",
      setId: "subjects-places-and-people",
      word: "subject",
      partOfSpeech: "noun",
      cefrLevel: "A2",
      gradeBand: "6-7",
      studentMeaningEn: "an area of study",
      vnMeaning: "môn học",
      exampleSentence: "Science is my favorite subject.",
      difficulty: 2,
      practiceTypes: ["matching", "cloze"],
      examples: [
        {
          id: " subject-transfer ",
          text: " We have a different subject after lunch. ",
          purpose: "transfer",
          context: " school timetable ",
        },
      ],
      usagePatterns: [
        {
          id: "subject-pattern-1",
          pattern: " favorite subject ",
          example: " Science is my favorite subject. ",
        },
      ],
      productionPrompts: [
        {
          id: "subject-prompt-1",
          prompt: " Which subject would you like to improve? ",
          sentenceStarter: " I would like to improve ___ because ___. ",
          modelAnswer: " I would like to improve science because I enjoy experiments. ",
        },
      ],
      clozeContexts: [
        {
          id: "subject-cloze-1",
          text: "Art is the ____ I enjoy most this year.",
          acceptableAnswers: [" subject ", ""],
          difficulty: 8,
          clueType: "meaning",
        },
      ],
      confusions: [
        {
          word: " topic ",
          distinction: "A subject is a school area; a topic is one part of it.",
          contrastExample: "Science is the subject, and space is today's topic.",
        },
      ],
      usageNote: " Use subject for a school area of study. ",
    });

    expect(item.examples?.[0]).toEqual({
      id: "subject-transfer",
      text: "We have a different subject after lunch.",
      purpose: "transfer",
      context: "school timetable",
    });
    expect(item.productionPrompts?.[0]?.modelAnswer).toBe(
      "I would like to improve science because I enjoy experiments.",
    );
    expect(item.clozeContexts?.[0]?.acceptableAnswers).toEqual(["subject"]);
    expect(item.clozeContexts?.[0]?.difficulty).toBe(5);
    expect(item.confusions?.[0]?.word).toBe("topic");
    expect(item.usageNote).toBe("Use subject for a school area of study.");
  });

  it("reports malformed rich-language entries while legacy content remains valid", () => {
    const pack = getCompleteSecondaryVocabPack();
    const item = pack.topics[0]!.sets[0]!.items[0]!;
    const originalExamples = item.examples;
    const originalClozeContexts = item.clozeContexts;

    item.examples = [
      { id: "same-id", text: "", purpose: "introductory" },
    ];
    item.clozeContexts = [
      { id: "same-id", text: "No blank here.", acceptableAnswers: [], difficulty: 2 },
    ];

    const issues = collectSecondaryVocabPackValidationIssues(pack);
    expect(issues.some((issue) => issue.code === "duplicate_rich_content_id")).toBe(true);
    expect(issues.some((issue) => issue.code === "empty_rich_example")).toBe(true);
    expect(issues.some((issue) => issue.code === "invalid_cloze_context")).toBe(true);

    item.examples = originalExamples;
    item.clozeContexts = originalClozeContexts;
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
