import { describe, expect, it } from "vitest";
import {
  createSampleWordAnnotationDocument,
  isWordAnnotationMastered,
  scoreWordAnnotationAnswers,
  validateWordAnnotationDocument,
  wordAnnotationStubPack,
} from "@/lib/word-annotation";

describe("word annotation module", () => {
  it("validates the HT1 sample", () => {
    const doc = createSampleWordAnnotationDocument();
    expect(doc.sentences).toHaveLength(5);
    expect(wordAnnotationStubPack(doc).kind).toBe("word-annotation-pack");
  });

  it("scores correct, expected, and incorrect markings", () => {
    const doc = createSampleWordAnnotationDocument();
    const perfect: Record<string, "adjective" | "adverb"> = {};
    for (const sentence of doc.sentences) {
      for (const token of sentence.tokens) {
        if (token.role) perfect[token.id] = token.role;
      }
    }
    const score = scoreWordAnnotationAnswers(doc.sentences, perfect);
    expect(score.incorrect).toBe(0);
    expect(score.correct).toBe(score.expected);
    expect(isWordAnnotationMastered(score)).toBe(true);

    const messy = { ...perfect, "m1-we": "adjective" as const };
    const messyScore = scoreWordAnnotationAnswers(doc.sentences, messy);
    expect(messyScore.incorrect).toBeGreaterThan(0);
    expect(isWordAnnotationMastered(messyScore)).toBe(false);
  });

  it("rejects documents with no target roles", () => {
    expect(() =>
      validateWordAnnotationDocument({
        version: 1,
        kind: "word-annotation",
        id: "empty",
        title: "Empty",
        instructions: "Mark words.",
        rememberText: "Remember.",
        sentences: [
          {
            id: "s1",
            tokens: [
              { id: "t1", text: "Hello", role: null },
              { id: "t2", text: "world", role: null },
            ],
          },
        ],
      }),
    ).toThrow(/At least one token/);
  });
});
