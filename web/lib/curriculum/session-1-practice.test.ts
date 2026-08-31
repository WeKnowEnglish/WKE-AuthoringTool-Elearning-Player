import { describe, expect, it } from "vitest";
import {
  SESSION_1_GRAMMAR_ITEMS,
  SESSION_1_LETTER_SCRAMBLES,
  SESSION_1_SENTENCE_FIXES,
  SESSION_1_VOCABULARY,
  SESSION_1_WRITING_PROMPT,
  normalizeSession1Sentence,
} from "./session-1-practice";

describe("Session 1 practice content", () => {
  it("uses a unique, complete vocabulary set", () => {
    expect(SESSION_1_VOCABULARY).toHaveLength(8);
    expect(new Set(SESSION_1_VOCABULARY.map((card) => card.id)).size).toBe(
      SESSION_1_VOCABULARY.length,
    );
    for (const card of SESSION_1_VOCABULARY) {
      expect(card.word.trim()).not.toBe("");
      expect(card.meaning.trim()).not.toBe("");
      expect(card.example).toMatch(/[.!?]$/);
    }
  });

  it("provides exactly the letters needed for every scramble", () => {
    for (const item of SESSION_1_LETTER_SCRAMBLES) {
      expect([...item.letters].sort().join("")).toBe(
        [...item.answer].sort().join(""),
      );
    }
  });

  it("keeps every grammar answer visible among its options", () => {
    expect(SESSION_1_GRAMMAR_ITEMS).toHaveLength(5);
    for (const item of SESSION_1_GRAMMAR_ITEMS) {
      expect(item.options).toContain(item.answer);
      expect(item.support.trim()).not.toBe("");
    }
  });

  it("gives each sentence repair a meaningful correction", () => {
    expect(SESSION_1_SENTENCE_FIXES).toHaveLength(3);
    for (const item of SESSION_1_SENTENCE_FIXES) {
      expect(normalizeSession1Sentence(item.incorrect)).not.toBe(
        normalizeSession1Sentence(item.answer),
      );
      expect(item.hint.trim()).not.toBe("");
    }
  });

  it("normalizes harmless punctuation, spacing, and capitalization", () => {
    expect(normalizeSession1Sentence("  SHE   LIKES painting! ")).toBe(
      normalizeSession1Sentence("She likes painting."),
    );
  });

  it("sets an achievable Movers-level free-writing threshold", () => {
    expect(SESSION_1_WRITING_PROMPT.minimumWords).toBeGreaterThanOrEqual(12);
    expect(SESSION_1_WRITING_PROMPT.minimumWords).toBeLessThanOrEqual(25);
    expect(SESSION_1_WRITING_PROMPT.sentenceStarters.length).toBeGreaterThanOrEqual(3);
  });
});
