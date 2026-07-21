import { describe, expect, it } from "vitest";
import {
  compilePackLetterScrambleQuiz,
  createPackQuizDraft,
  packLetterScrambleAcceptedWords,
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

describe("compilePackLetterScrambleQuiz", () => {
  const draft = createPackQuizDraft({
    packId: "pack-1",
    packTitle: "Pets",
    format: "letter_scramble",
    wordIds: ["a", "b", "c"],
  });

  it("builds one letter_mixup question per usable word", () => {
    const lexemes = [
      lex({ id: "a", lemma: "cat" }),
      lex({ id: "b", lemma: "dog" }),
      lex({ id: "c", lemma: "bird" }),
    ];

    const result = compilePackLetterScrambleQuiz({
      draft,
      lexemes,
      seed: "stable-seed",
    });

    expect(result.questions.length).toBe(3);
    for (const q of result.questions) {
      expect(q.format).toBe("letter_scramble");
      if (q.format !== "letter_scramble") continue;
      expect(q.payload.subtype).toBe("letter_mixup");
      expect(q.payload.items).toHaveLength(1);
      expect(q.payload.shuffle_letters).toBe(true);
      expect(q.payload.image_use_tts).toBe(true);
      const item = q.payload.items[0]!;
      expect(item.target_word.length).toBeGreaterThanOrEqual(2);
      expect(item.accepted_words?.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("is deterministic for the same seed", () => {
    const lexemes = [
      lex({ id: "a", lemma: "cat" }),
      lex({ id: "b", lemma: "dog" }),
      lex({ id: "c", lemma: "bird" }),
    ];
    const a = compilePackLetterScrambleQuiz({ draft, lexemes, seed: "same" });
    const b = compilePackLetterScrambleQuiz({ draft, lexemes, seed: "same" });
    expect(a.questions.map((q) => q.id)).toEqual(b.questions.map((q) => q.id));
    expect(
      a.questions.map((q) =>
        q.format === "letter_scramble" ? q.payload.items[0]?.target_word : "",
      ),
    ).toEqual(
      b.questions.map((q) =>
        q.format === "letter_scramble" ? q.payload.items[0]?.target_word : "",
      ),
    );
  });

  it("skips missing, archived, and too-short lemmas", () => {
    const result = compilePackLetterScrambleQuiz({
      draft,
      lexemes: [
        lex({ id: "a", lemma: "cat" }),
        lex({ id: "b", lemma: "I", archived: false }),
        lex({ id: "c", lemma: "x", source: "missing" }),
      ],
      seed: "skip",
    });
    expect(result.questions).toHaveLength(1);
    expect(result.skippedWordIds).toEqual(["b", "c"]);
  });

  it("builds accepted spellings for case-insensitive play", () => {
    expect(packLetterScrambleAcceptedWords("cat")).toEqual(["cat", "Cat"]);
    expect(packLetterScrambleAcceptedWords("I")).toEqual(["I"]);
  });
});
