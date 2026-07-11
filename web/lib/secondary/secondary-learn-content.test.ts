import { describe, expect, it } from "vitest";
import {
  buildSecondaryLearnClozePreview,
  buildSecondaryLearnExampleLines,
  formatSecondarySyllableHint,
  getSecondaryLearnSectionVisibility,
  splitTextAroundWord,
} from "@/lib/secondary/secondary-learn-content";
import type { SecondaryVocabItem } from "@/lib/secondary/types";

function makeItem(overrides: Partial<SecondaryVocabItem> = {}): SecondaryVocabItem {
  return {
    wordItemId: "test-word",
    packId: "pack",
    topicId: "school-life",
    setId: "set",
    word: "subject",
    lemma: "subject",
    partOfSpeech: "noun",
    cefrLevel: "A2",
    gradeBand: "6-7",
    studentMeaningEn: "an area of study",
    vnMeaning: "mon hoc",
    exampleSentence: "My favorite subject is science.",
    difficulty: 2,
    practiceTypes: ["matching"],
    tags: [],
    ...overrides,
  };
}

describe("secondary-learn-content", () => {
  it("builds cloze preview from sentenceFrame (tier A)", () => {
    const item = makeItem({
      sentenceFrame: "My favorite ___ is science.",
      exampleSentence: "Science is fun.",
    });
    expect(buildSecondaryLearnClozePreview(item)).toBe("My favorite ____ is science.");
  });

  it("builds cloze preview from example sentence (tier B)", () => {
    const item = makeItem({
      exampleSentence: "We study science in every subject class.",
      word: "subject",
    });
    expect(buildSecondaryLearnClozePreview(item)).toBe(
      "We study science in every ____ class.",
    );
  });

  it("hides cloze preview for tier C items", () => {
    const item = makeItem({
      exampleSentence: "School is fun.",
      word: "subject",
    });
    expect(buildSecondaryLearnClozePreview(item)).toBeNull();
  });

  it("builds example lines with sentence and phrase chunks", () => {
    const lines = buildSecondaryLearnExampleLines(
      makeItem({
        commonChunks: ["favorite subject", "school subject", "extra chunk"],
      }),
    );
    expect(lines).toHaveLength(3);
    expect(lines[0]).toMatchObject({ kind: "sentence" });
    expect(lines[1]).toMatchObject({ kind: "phrase", text: "favorite subject" });
    expect(lines[2]).toMatchObject({ kind: "phrase", text: "school subject" });
  });

  it("prefers labelled rich examples and does not mix in legacy chunks", () => {
    const lines = buildSecondaryLearnExampleLines(
      makeItem({
        examples: [
          {
            id: "subject-intro-1",
            text: "Science is my favorite subject because we do experiments.",
            purpose: "introductory",
          },
          {
            id: "subject-transfer-1",
            text: "We have a different subject after lunch.",
            purpose: "transfer",
          },
        ],
        commonChunks: ["favorite subject", "school subject"],
      }),
    );

    expect(lines).toEqual([
      {
        kind: "sentence",
        text: "Science is my favorite subject because we do experiments.",
        highlightWord: "subject",
        label: "Example",
      },
      {
        kind: "sentence",
        text: "We have a different subject after lunch.",
        highlightWord: "subject",
        label: "Another context",
      },
    ]);
  });

  it("formats syllable hints", () => {
    expect(formatSecondarySyllableHint(["sub", "ject"])).toBe("sub-ject");
  });

  it("reports section visibility from item fields", () => {
    const item = makeItem({
      sentenceFrame: "My favorite ___ is science.",
      spellingSupport: { syllables: ["sub", "ject"], commonMistakes: ["subjet"] },
    });
    expect(getSecondaryLearnSectionVisibility(item)).toEqual({
      examples: true,
      cloze: true,
      memory: true,
    });
  });

  it("splits text around the target word for highlighting", () => {
    expect(splitTextAroundWord("My favorite subject is science.", "subject")).toEqual([
      { text: "My favorite ", highlight: false },
      { text: "subject", highlight: true },
      { text: " is science.", highlight: false },
    ]);
  });
});
