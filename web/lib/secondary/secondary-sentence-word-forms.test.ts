import { describe, expect, it } from "vitest";
import {
  buildSentenceWordFormCandidates,
  sentenceContainsTargetWordForms,
} from "@/lib/secondary/secondary-sentence-word-forms";

describe("secondary-sentence-word-forms", () => {
  it("accepts adjective comparative and adverb forms", () => {
    expect(
      sentenceContainsTargetWordForms("She was braver than me.", {
        targetWord: "brave",
        lemma: "brave",
        partOfSpeech: "adjective",
      }),
    ).toBe(true);

    expect(
      sentenceContainsTargetWordForms("He answered bravely.", {
        targetWord: "brave",
        lemma: "brave",
        partOfSpeech: "adjective",
      }),
    ).toBe(true);
  });

  it("accepts regular verb conjugations", () => {
    expect(
      sentenceContainsTargetWordForms("She revises every night.", {
        targetWord: "revise",
        lemma: "revise",
        partOfSpeech: "verb",
      }),
    ).toBe(true);

    expect(
      sentenceContainsTargetWordForms("He is revising now.", {
        targetWord: "revise",
        lemma: "revise",
        partOfSpeech: "verb",
      }),
    ).toBe(true);
  });

  it("accepts inflected phrasal verb forms", () => {
    const forms = buildSentenceWordFormCandidates({
      targetWord: "wake up",
      lemma: "wake up",
      partOfSpeech: "phrase",
    });

    expect(forms).toContain("woke up");
    expect(sentenceContainsTargetWordForms("I woke up early.", {
      targetWord: "wake up",
      lemma: "wake up",
      partOfSpeech: "phrase",
    })).toBe(true);
  });

  it("rejects unrelated words that only share a prefix", () => {
    expect(
      sentenceContainsTargetWordForms("Her bravery helped.", {
        targetWord: "brave",
        lemma: "brave",
        partOfSpeech: "adjective",
      }),
    ).toBe(false);
  });
});
