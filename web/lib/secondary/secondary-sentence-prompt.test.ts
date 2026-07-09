import { describe, expect, it } from "vitest";
import {
  buildSecondarySentencePrompt,
  isSecondarySentenceTextValid,
  normalizeSecondarySentenceText,
  wordItemHasSentencePromptContent,
} from "@/lib/secondary/secondary-sentence-prompt";
import type { SecondaryVocabItem } from "@/lib/secondary/types";

function item(overrides: Partial<SecondaryVocabItem> = {}): SecondaryVocabItem {
  return {
    wordItemId: "g7-a2-test",
    packId: "p",
    topicId: "t",
    setId: "s",
    word: "brave",
    lemma: "brave",
    partOfSpeech: "adjective",
    cefrLevel: "A2",
    gradeBand: "7",
    studentMeaningEn: "not afraid",
    vnMeaning: "dũng cảm",
    exampleSentence: "She is brave.",
    difficulty: 1,
    practiceTypes: ["sentence_builder"],
    tags: [],
    ...overrides,
  };
}

describe("secondary-sentence-prompt", () => {
  it("requires example or frame content", () => {
    expect(wordItemHasSentencePromptContent(item())).toBe(true);
    expect(
      wordItemHasSentencePromptContent(
        item({ exampleSentence: "", sentenceFrame: "She is ____." }),
      ),
    ).toBe(true);
    expect(
      wordItemHasSentencePromptContent(item({ exampleSentence: "", sentenceFrame: undefined })),
    ).toBe(false);
  });

  it("builds instruction and frame hint", () => {
    const prompt = buildSecondarySentencePrompt(
      item({ sentenceFrame: "He was very ____ in the race." }),
    );
    expect(prompt.targetWord).toBe("brave");
    expect(prompt.instruction).toContain("brave");
    expect(prompt.frameHint).toBe("He was very ____ in the race.");
  });

  it("normalizes and validates sentence text", () => {
    expect(normalizeSecondarySentenceText("  She   is brave.  ")).toBe("She is brave.");
    expect(isSecondarySentenceTextValid("Hello")).toBe(true);
    expect(isSecondarySentenceTextValid("   ")).toBe(false);
    expect(isSecondarySentenceTextValid("x".repeat(501))).toBe(false);
  });
});
