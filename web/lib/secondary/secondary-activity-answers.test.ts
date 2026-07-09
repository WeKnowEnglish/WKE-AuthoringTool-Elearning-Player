import { describe, expect, it } from "vitest";
import {
  isSecondarySpellingAnswerCorrect,
  normalizeSecondaryTypedAnswer,
} from "@/lib/secondary/secondary-activity-answers";
import { getAllSecondaryVocabItems } from "@/lib/secondary/secondary-vocab-bank";
import { getCompleteSecondaryVocabPack } from "@/lib/secondary/secondary-vocab-pack-loader";
import { filterWordItemIdsForSecondaryActivity } from "@/lib/secondary/secondary-practice-types";
import { getSecondaryVocabItemsByIds } from "@/lib/secondary/secondary-vocab-bank";

describe("secondary-activity-answers", () => {
  it("normalizes whitespace in typed answers", () => {
    expect(normalizeSecondaryTypedAnswer("  Hello   World  ")).toBe("hello world");
  });

  it("accepts the pack word for spelling-eligible items", () => {
    const spellingIds = filterWordItemIdsForSecondaryActivity(
      getAllSecondaryVocabItems(getCompleteSecondaryVocabPack()).map((item) => item.wordItemId),
      "spelling",
    ).slice(0, 20);
    const items = getSecondaryVocabItemsByIds(spellingIds);
    for (const item of items) {
      expect(isSecondarySpellingAnswerCorrect(item, item.word)).toBe(true);
    }
  });
});
