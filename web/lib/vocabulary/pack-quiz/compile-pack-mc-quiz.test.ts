import { describe, expect, it } from "vitest";
import {
  compilePackMultipleChoiceQuiz,
  createPackQuizDraft,
  hydratePackLexemeDefinitions,
} from "@/lib/vocabulary/pack-quiz";
import type { PackLexemeResolution } from "@/lib/vocabulary/teacher-lexicon/resolve-pack";
import type { PlatformLexiconEntry } from "@/lib/vocabulary/platform-lexicon";

function lex(
  partial: Partial<PackLexemeResolution> & Pick<PackLexemeResolution, "id" | "lemma">,
): PackLexemeResolution {
  return {
    pos: "noun",
    primaryStageCandidate: "starter",
    primaryTopic: "animals",
    source: "teacher",
    archived: false,
    readyForClass: true,
    definitionEn: null,
    definitionVi: null,
    ...partial,
  };
}

describe("compilePackMultipleChoiceQuiz", () => {
  const draft = createPackQuizDraft({
    packId: "pack-1",
    packTitle: "Pets",
    format: "multiple_choice",
    wordIds: ["a", "b", "c", "d"],
  });

  it("builds 4-option MC payloads with one correct answer", () => {
    const lexemes = [
      lex({ id: "a", lemma: "cat", definitionEn: "a small pet that meows" }),
      lex({ id: "b", lemma: "dog", definitionEn: "a pet that barks" }),
      lex({ id: "c", lemma: "bird", definitionEn: "an animal with feathers" }),
      lex({ id: "d", lemma: "fish", definitionEn: "an animal that lives in water" }),
    ];

    const result = compilePackMultipleChoiceQuiz({
      draft,
      lexemes,
      seed: "stable-seed",
      questionCount: 4,
    });

    expect(result.questions.length).toBe(4);
    for (const q of result.questions) {
      expect(q.payload.subtype).toBe("mc_quiz");
      expect(q.payload.options).toHaveLength(4);
      const correct = q.payload.options.find((o) => o.id === q.payload.correct_option_id);
      expect(correct).toBeTruthy();
      expect(q.mode === "word_for_meaning_en" || q.mode === "meaning_for_word_en").toBe(true);
    }
  });

  it("is seed-stable", () => {
    const lexemes = [
      lex({ id: "a", lemma: "cat", definitionEn: "meows" }),
      lex({ id: "b", lemma: "dog", definitionEn: "barks" }),
      lex({ id: "c", lemma: "bird", definitionEn: "flies" }),
      lex({ id: "d", lemma: "fish", definitionEn: "swims" }),
    ];
    const a = compilePackMultipleChoiceQuiz({ draft, lexemes, seed: "same" });
    const b = compilePackMultipleChoiceQuiz({ draft, lexemes, seed: "same" });
    expect(a.questions.map((q) => q.id)).toEqual(b.questions.map((q) => q.id));
    expect(a.questions.map((q) => q.payload.correct_option_id)).toEqual(
      b.questions.map((q) => q.payload.correct_option_id),
    );
  });

  it("falls back to find_lemma when definitions are missing", () => {
    const lexemes = [
      lex({ id: "a", lemma: "cat" }),
      lex({ id: "b", lemma: "dog" }),
      lex({ id: "c", lemma: "bird" }),
      lex({ id: "d", lemma: "fish" }),
    ];
    const result = compilePackMultipleChoiceQuiz({ draft, lexemes, seed: "x" });
    expect(result.questions.length).toBeGreaterThan(0);
    expect(result.questions.every((q) => q.mode === "find_lemma")).toBe(true);
    expect(result.warnings.some((w) => /No English definitions/i.test(w))).toBe(true);
  });

  it("skips missing ids and rejects fewer than 4 usable words", () => {
    const lexemes = [
      lex({ id: "a", lemma: "cat", definitionEn: "meows" }),
      lex({ id: "b", lemma: "dog", definitionEn: "barks" }),
      lex({ id: "c", lemma: "bird", source: "missing" }),
    ];
    const shortDraft = createPackQuizDraft({
      packId: "p",
      packTitle: "t",
      format: "multiple_choice",
      wordIds: ["a", "b", "c", "gone"],
    });
    const result = compilePackMultipleChoiceQuiz({ draft: shortDraft, lexemes, seed: "y" });
    expect(result.questions).toEqual([]);
    expect(result.skippedWordIds).toEqual(expect.arrayContaining(["c", "gone"]));
    expect(result.warnings[0]).toMatch(/at least 4 usable/i);
  });

  it("honors frozen draft wordIds order for the pool", () => {
    const draftFive = createPackQuizDraft({
      packId: "p",
      packTitle: "t",
      format: "multiple_choice",
      wordIds: ["a", "b", "c", "d", "e"],
    });
    const lexemes = [
      lex({ id: "e", lemma: "elephant", definitionEn: "a large animal" }),
      lex({ id: "a", lemma: "ant", definitionEn: "a tiny insect" }),
      lex({ id: "b", lemma: "bear", definitionEn: "a big animal" }),
      lex({ id: "c", lemma: "cat", definitionEn: "a pet" }),
      lex({ id: "d", lemma: "dog", definitionEn: "a friend" }),
    ];
    const result = compilePackMultipleChoiceQuiz({
      draft: draftFive,
      lexemes,
      seed: "z",
      questionCount: 5,
    });
    expect(result.questions).toHaveLength(5);
    expect(new Set(result.questions.map((q) => q.wordId))).toEqual(
      new Set(["a", "b", "c", "d", "e"]),
    );
  });
});

describe("hydratePackLexemeDefinitions", () => {
  it("fills empty platform defs from published lexicon rows", () => {
    const rows: PackLexemeResolution[] = [
      lex({ id: "pv_1", lemma: "cat", source: "platform", definitionEn: null }),
      lex({ id: "tw_1", lemma: "dog", source: "teacher", definitionEn: "barks" }),
    ];
    const platform: PlatformLexiconEntry[] = [
      {
        id: "pv_1",
        lemma: "cat",
        normalized: "cat",
        entryKind: "word",
        pos: "noun",
        primaryStage: "starter",
        cefrBandCandidate: null,
        primaryTopic: "animals",
        learnerDefinitionEn: "a small pet",
        learnerMeaningVi: "con mèo",
        note: null,
        vocabularyLane: "general_english",
        status: "published",
        sourceTeacherEntryId: null,
        promotedBy: null,
        createdAt: "",
        updatedAt: "",
      },
    ];
    const hydrated = hydratePackLexemeDefinitions(rows, platform);
    expect(hydrated[0]?.definitionEn).toBe("a small pet");
    expect(hydrated[0]?.definitionVi).toBe("con mèo");
    expect(hydrated[1]?.definitionEn).toBe("barks");
  });
});
