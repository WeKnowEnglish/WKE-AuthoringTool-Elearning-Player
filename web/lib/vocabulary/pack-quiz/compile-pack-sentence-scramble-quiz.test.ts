import { describe, expect, it } from "vitest";
import {
  compilePackSentenceScrambleQuiz,
  createPackQuizDraft,
  packSentenceScrambleStarter,
  tokenizeSentenceForScramble,
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

describe("compilePackSentenceScrambleQuiz", () => {
  const draft = createPackQuizDraft({
    packId: "pack-1",
    packTitle: "Pets",
    format: "sentence_scramble",
    wordIds: ["a", "b", "c"],
  });

  it("builds one drag_sentence question per usable word", () => {
    const lexemes = [
      lex({ id: "a", lemma: "cat" }),
      lex({ id: "b", lemma: "dog" }),
      lex({ id: "c", lemma: "bird" }),
    ];

    const result = compilePackSentenceScrambleQuiz({
      draft,
      lexemes,
      seed: "stable-seed",
    });

    expect(result.questions.length).toBe(3);
    for (const q of result.questions) {
      expect(q.format).toBe("sentence_scramble");
      if (q.format !== "sentence_scramble") continue;
      expect(q.payload.subtype).toBe("drag_sentence");
      expect(q.payload.correct_order.length).toBeGreaterThanOrEqual(2);
      expect(q.payload.word_bank).toHaveLength(q.payload.correct_order.length);
      expect(q.payload.sentence_slots).toHaveLength(q.payload.correct_order.length);
      expect([...q.payload.word_bank].sort()).toEqual([...q.payload.correct_order].sort());
    }
    expect(result.warnings.some((w) => /starter sentence/i.test(w))).toBe(true);
  });

  it("is deterministic for the same seed", () => {
    const lexemes = [
      lex({ id: "a", lemma: "cat" }),
      lex({ id: "b", lemma: "dog" }),
      lex({ id: "c", lemma: "bird" }),
    ];
    const a = compilePackSentenceScrambleQuiz({ draft, lexemes, seed: "same" });
    const b = compilePackSentenceScrambleQuiz({ draft, lexemes, seed: "same" });
    expect(a.questions.map((q) => q.id)).toEqual(b.questions.map((q) => q.id));
    expect(
      a.questions.map((q) =>
        q.format === "sentence_scramble" ? q.payload.correct_order.join(" ") : "",
      ),
    ).toEqual(
      b.questions.map((q) =>
        q.format === "sentence_scramble" ? q.payload.correct_order.join(" ") : "",
      ),
    );
  });

  it("uses curated exampleSentence when present", () => {
    const shortDraft = createPackQuizDraft({
      packId: "pack-1",
      packTitle: "Pets",
      format: "sentence_scramble",
      wordIds: ["a"],
    });
    const result = compilePackSentenceScrambleQuiz({
      draft: shortDraft,
      lexemes: [
        {
          ...lex({ id: "a", lemma: "cat" }),
          exampleSentence: "I see a white cat.",
        } as PackLexemeResolution & { exampleSentence: string },
      ],
      seed: "curated",
    });
    expect(result.questions).toHaveLength(1);
    const q = result.questions[0];
    expect(q?.format).toBe("sentence_scramble");
    if (q?.format === "sentence_scramble") {
      expect(q.payload.correct_order.join(" ")).toBe("I see a white cat.");
    }
    expect(result.warnings.some((w) => /starter sentence/i.test(w))).toBe(false);
  });

  it("tokenizes and builds starter lines", () => {
    expect(tokenizeSentenceForScramble("  This is a cat.  ")).toEqual([
      "This",
      "is",
      "a",
      "cat.",
    ]);
    expect(packSentenceScrambleStarter("cat", "seed-a").length).toBeGreaterThan(5);
  });
});
