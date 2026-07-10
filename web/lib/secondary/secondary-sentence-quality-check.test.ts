import { describe, expect, it } from "vitest";
import { validateSecondarySentenceQuality } from "@/lib/secondary/secondary-sentence-quality-check";

describe("secondary-sentence-quality-check", () => {
  const base = {
    targetWord: "brave",
    lemma: "brave",
    partOfSpeech: "adjective" as const,
  };

  it("accepts a well-formed sentence", () => {
    const result = validateSecondarySentenceQuality({
      ...base,
      text: "  She is brave.  ",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.normalized).toBe("She is brave.");
    }
  });

  it("requires the target word or an accepted form", () => {
    const missing = validateSecondarySentenceQuality({
      ...base,
      text: "She is strong.",
    });
    expect(missing.ok).toBe(false);
    if (!missing.ok) {
      expect(missing.message).toContain("brave");
    }

    const inflected = validateSecondarySentenceQuality({
      ...base,
      text: "She was braver today.",
    });
    expect(inflected.ok).toBe(true);

    const derivedNoun = validateSecondarySentenceQuality({
      ...base,
      text: "Her bravery helped.",
    });
    expect(derivedNoun.ok).toBe(false);
  });

  it("accepts lemma match when different from display word", () => {
    const missing = validateSecondarySentenceQuality({
      targetWord: "children",
      lemma: "child",
      text: "They played outside.",
    });
    expect(missing.ok).toBe(false);

    const lemmaMatch = validateSecondarySentenceQuality({
      targetWord: "children",
      lemma: "child",
      partOfSpeech: "noun",
      text: "The child smiled.",
    });
    expect(lemmaMatch.ok).toBe(true);
  });

  it("enforces minimum length", () => {
    const result = validateSecondarySentenceQuality({
      ...base,
      text: "Brave.",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("full sentence");
    }
  });

  it("requires capital letter and ending punctuation", () => {
    const noCapital = validateSecondarySentenceQuality({
      ...base,
      text: "she is brave.",
    });
    expect(noCapital.ok).toBe(false);

    const noPunctuation = validateSecondarySentenceQuality({
      ...base,
      text: "She is brave",
    });
    expect(noPunctuation.ok).toBe(false);
  });
});
