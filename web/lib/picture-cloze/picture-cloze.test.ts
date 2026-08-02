import { describe, expect, it } from "vitest";
import {
  compilePictureClozeFromVocabList,
  createSamplePictureClozeDocument,
  isPictureClozeAnswerCorrect,
  pictureClozeStubPack,
  splitSentenceAroundWord,
  validatePictureClozeDocument,
} from "@/lib/picture-cloze";
import { createHobbiesVocabularyListDocument } from "@/lib/learning-tracks/create-hobbies-vocabulary-list";

describe("picture cloze module", () => {
  it("validates the tools sample", () => {
    const doc = createSamplePictureClozeDocument();
    expect(doc.items).toHaveLength(4);
    expect(doc.wordBank.length).toBeGreaterThanOrEqual(4);
    expect(pictureClozeStubPack(doc).kind).toBe("picture-cloze-pack");
  });

  it("scores answers with light normalization", () => {
    expect(isPictureClozeAnswerCorrect(" Tape measure! ", ["tape measure"])).toBe(
      true,
    );
    expect(isPictureClozeAnswerCorrect("hammer", ["saw"])).toBe(false);
  });

  it("splits example sentences around the target word", () => {
    expect(splitSentenceAroundWord("I like painting in art class.", "painting")).toEqual(
      {
        before: "I like ",
        after: " in art class.",
      },
    );
  });

  it("compiles from hobbies vocab list (image-ready words)", () => {
    const list = createHobbiesVocabularyListDocument();
    const doc = compilePictureClozeFromVocabList({ list, maxItems: 4 });
    expect(doc.items.length).toBeGreaterThan(0);
    expect(doc.items.length).toBeLessThanOrEqual(4);
    for (const item of doc.items) {
      expect(item.imageUrl).toBeTruthy();
      expect(item.acceptedAnswers[0]).toBeTruthy();
    }
    expect(() => validatePictureClozeDocument(doc)).not.toThrow();
  });
});
