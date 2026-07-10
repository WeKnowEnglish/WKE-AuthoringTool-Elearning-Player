import { describe, expect, it } from "vitest";
import {
  pickSecondarySentenceWordIds,
  SECONDARY_SENTENCE_WORDS_PER_SESSION,
} from "@/lib/secondary/secondary-sentence-word-set";

describe("secondary-sentence-word-set", () => {
  const eligible = ["w1", "w2", "w3", "w4", "w5", "w6", "w7", "w8"];

  it("picks five unused words when enough remain", () => {
    const selected = pickSecondarySentenceWordIds({
      eligibleWordIds: eligible,
      playedWordIds: ["w1", "w2"],
      count: SECONDARY_SENTENCE_WORDS_PER_SESSION,
      seed: "student:2026-07-10:sentence:r0",
    });

    expect(selected).toHaveLength(5);
    expect(selected.every((wordItemId) => !["w1", "w2"].includes(wordItemId))).toBe(true);
  });

  it("reuses the full pool when every word has already been played", () => {
    const selected = pickSecondarySentenceWordIds({
      eligibleWordIds: eligible,
      playedWordIds: eligible,
      count: SECONDARY_SENTENCE_WORDS_PER_SESSION,
      seed: "student:2026-07-10:sentence:r3",
    });

    expect(selected).toHaveLength(5);
    expect(new Set(selected).size).toBe(5);
  });

  it("is deterministic for the same seed", () => {
    const first = pickSecondarySentenceWordIds({
      eligibleWordIds: eligible,
      playedWordIds: [],
      count: SECONDARY_SENTENCE_WORDS_PER_SESSION,
      seed: "student:2026-07-10:sentence:r0",
    });
    const second = pickSecondarySentenceWordIds({
      eligibleWordIds: eligible,
      playedWordIds: [],
      count: SECONDARY_SENTENCE_WORDS_PER_SESSION,
      seed: "student:2026-07-10:sentence:r0",
    });

    expect(second).toEqual(first);
  });

  it("changes selection when replay seed changes", () => {
    const first = pickSecondarySentenceWordIds({
      eligibleWordIds: eligible,
      playedWordIds: ["w1", "w2", "w3", "w4", "w5"],
      count: SECONDARY_SENTENCE_WORDS_PER_SESSION,
      seed: "student:2026-07-10:sentence:r1",
    });
    const second = pickSecondarySentenceWordIds({
      eligibleWordIds: eligible,
      playedWordIds: ["w1", "w2", "w3", "w4", "w5"],
      count: SECONDARY_SENTENCE_WORDS_PER_SESSION,
      seed: "student:2026-07-10:sentence:r2",
    });

    expect(second).not.toEqual(first);
  });
});
