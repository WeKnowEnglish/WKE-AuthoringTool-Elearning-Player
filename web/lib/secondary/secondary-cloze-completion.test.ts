import { describe, expect, it } from "vitest";
import { isSecondaryClozeAnswerCorrect } from "@/lib/secondary/secondary-activity-answers";
import { compileSecondaryClozeFromWordIds } from "@/lib/secondary/secondary-cloze-compiler";
import {
  getAllSecondaryWordItemIds,
  getSecondaryVocabItemById,
} from "@/lib/secondary/secondary-vocab-bank";
import { getCompleteSecondaryVocabPack } from "@/lib/secondary/secondary-vocab-pack-loader";

describe("secondary-cloze-completion", () => {
  it("accepts the vocab word for each compiled blank", () => {
    const packIds = getAllSecondaryWordItemIds(getCompleteSecondaryVocabPack());
    const compiled = compileSecondaryClozeFromWordIds({
      wordItemIds: packIds,
      studentId: "student-a",
      dateKey: "2026-07-09",
    });
    expect(compiled).not.toBeNull();
    for (const wordItemId of compiled!.blankWordItemIds) {
      const item = getSecondaryVocabItemById(wordItemId);
      expect(item).toBeTruthy();
      expect(isSecondaryClozeAnswerCorrect(wordItemId, item!.word)).toBe(true);
    }
  });

  it("paragraph blank count matches blankWordItemIds length", () => {
    const packIds = getAllSecondaryWordItemIds(getCompleteSecondaryVocabPack());
    const compiled = compileSecondaryClozeFromWordIds({
      wordItemIds: packIds,
      studentId: "student-a",
      dateKey: "2026-07-09",
    });
    expect(compiled).not.toBeNull();
    const blankCount = (compiled!.paragraph.match(/____/g) ?? []).length;
    expect(blankCount).toBe(compiled!.blankWordItemIds.length);
  });
});
