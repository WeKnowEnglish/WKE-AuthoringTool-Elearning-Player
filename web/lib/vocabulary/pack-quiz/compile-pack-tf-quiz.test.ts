import { describe, expect, it } from "vitest";
import {
  compilePackTrueFalseQuiz,
  createPackQuizDraft,
} from "@/lib/vocabulary/pack-quiz";
import type { PackLexemeResolution } from "@/lib/vocabulary/teacher-lexicon/resolve-pack";

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

describe("compilePackTrueFalseQuiz", () => {
  const draft = createPackQuizDraft({
    packId: "pack-1",
    packTitle: "Pets",
    format: "true_false",
    wordIds: ["a", "b", "c"],
  });

  it("builds one true_false question per usable word", () => {
    const lexemes = [
      lex({ id: "a", lemma: "cat", definitionEn: "a small pet that meows" }),
      lex({ id: "b", lemma: "dog", definitionEn: "a pet that barks" }),
      lex({ id: "c", lemma: "bird", definitionEn: "an animal with feathers" }),
    ];

    const result = compilePackTrueFalseQuiz({
      draft,
      lexemes,
      seed: "stable-seed",
    });

    expect(result.questions.length).toBe(3);
    for (const q of result.questions) {
      expect(q.format).toBe("true_false");
      if (q.format !== "true_false") continue;
      expect(q.payload.subtype).toBe("true_false");
      expect(typeof q.payload.correct).toBe("boolean");
      expect(q.payload.statement.trim().length).toBeGreaterThan(0);
      expect(q.payload.picture_truth_statement?.trim().length).toBeGreaterThan(0);
    }
  });

  it("is deterministic for the same seed", () => {
    const lexemes = [
      lex({ id: "a", lemma: "cat" }),
      lex({ id: "b", lemma: "dog" }),
      lex({ id: "c", lemma: "bird" }),
    ];
    const a = compilePackTrueFalseQuiz({ draft, lexemes, seed: "same" });
    const b = compilePackTrueFalseQuiz({ draft, lexemes, seed: "same" });
    expect(a.questions.map((q) => q.id)).toEqual(b.questions.map((q) => q.id));
    expect(
      a.questions.map((q) => (q.format === "true_false" ? q.payload.statement : "")),
    ).toEqual(
      b.questions.map((q) => (q.format === "true_false" ? q.payload.statement : "")),
    );
  });

  it("warns and uses only true claims when a single word is selected", () => {
    const shortDraft = createPackQuizDraft({
      packId: "pack-1",
      packTitle: "Pets",
      format: "true_false",
      wordIds: ["a"],
    });
    const result = compilePackTrueFalseQuiz({
      draft: shortDraft,
      lexemes: [lex({ id: "a", lemma: "cat" })],
      seed: "solo",
    });
    expect(result.questions).toHaveLength(1);
    expect(result.warnings.some((w) => /one word/i.test(w))).toBe(true);
    const q = result.questions[0];
    expect(q?.format).toBe("true_false");
    if (q?.format === "true_false") {
      expect(q.payload.correct).toBe(true);
    }
  });

  it("skips missing/archived words", () => {
    const result = compilePackTrueFalseQuiz({
      draft,
      lexemes: [
        lex({ id: "a", lemma: "cat" }),
        lex({ id: "b", lemma: "dog", archived: true }),
        lex({ id: "c", lemma: "", source: "missing" }),
      ],
      seed: "skip",
    });
    expect(result.questions).toHaveLength(1);
    expect(result.skippedWordIds).toEqual(["b", "c"]);
  });
});
