import { describe, expect, it } from "vitest";
import {
  chunkTokensForSentenceScramble,
  normalizeDragSentenceLists,
  scrambleTilesFromSentence,
  SENTENCE_SCRAMBLE_SOFT_MAX_TILES,
  tokenizeSentenceForScramble,
} from "./scramble-tiles";

describe("scramble tile chunking", () => {
  it("tokenizes on whitespace and keeps punctuation on the word", () => {
    expect(tokenizeSentenceForScramble("  We buy bread at the bakery.  ")).toEqual([
      "We",
      "buy",
      "bread",
      "at",
      "the",
      "bakery.",
    ]);
  });

  it("leaves short sentences alone", () => {
    const tokens = tokenizeSentenceForScramble("I like bread with butter.");
    expect(chunkTokensForSentenceScramble(tokens)).toEqual(tokens);
  });

  it("chunks long sentences down to the soft max", () => {
    const sentence =
      "We buy fresh bread at the bakery every day after school with our friends.";
    const tiles = scrambleTilesFromSentence(sentence);
    expect(tiles.length).toBeLessThanOrEqual(SENTENCE_SCRAMBLE_SOFT_MAX_TILES);
    expect(tiles.length).toBeGreaterThanOrEqual(2);
    expect(tiles.join(" ")).toBe(sentence.trim());
  });

  it("prefers merging glue words instead of content words", () => {
    const tiles = scrambleTilesFromSentence(
      "The big dog sat on the mat near the door today.",
      6,
    );
    expect(tiles.length).toBeLessThanOrEqual(6);
    // At least one phrase tile should contain a determiner glue merge.
    expect(tiles.some((t) => /\bthe\b/i.test(t) && t.includes(" "))).toBe(true);
  });
});

describe("normalizeDragSentenceLists", () => {
  it("rebuilds slots from correct order and repairs bank length drift", () => {
    const normalized = normalizeDragSentenceLists({
      correctOrder: ["We", "buy", "bread"],
      wordBank: ["buy", "We"], // truncated legacy bank
      sentenceSlots: ["", ""],
    });
    expect(normalized.correct_order).toEqual(["We", "buy", "bread"]);
    expect(normalized.sentence_slots).toEqual(["", "", ""]);
    expect(normalized.word_bank).toEqual(["We", "buy", "bread"]);
  });

  it("keeps a matching shuffled bank", () => {
    const normalized = normalizeDragSentenceLists({
      correctOrder: ["We", "buy", "bread"],
      wordBank: ["bread", "We", "buy"],
    });
    expect(normalized.word_bank).toEqual(["bread", "We", "buy"]);
  });
});
