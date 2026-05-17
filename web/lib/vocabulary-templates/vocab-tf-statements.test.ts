import { describe, expect, it } from "vitest";
import {
  buildVocabTrueFalseStatement,
  isClozeDerivedSentence,
  isPictureDescriptionStatement,
} from "./vocab-tf-statements";
import { hasBrokenThisIsPattern, thisLemmaStatement } from "./lemma-statement";
import { A1_BREAKFAST_FOOD } from "./sets/a1-breakfast-food";

describe("isClozeDerivedSentence", () => {
  it("detects filled cloze lines from the set", () => {
    expect(isClozeDerivedSentence(A1_BREAKFAST_FOOD, "I like bread with jam.")).toBe(true);
    expect(isClozeDerivedSentence(A1_BREAKFAST_FOOD, "I peel an orange.")).toBe(true);
  });

  it("allows picture-description T/F lines", () => {
    expect(isClozeDerivedSentence(A1_BREAKFAST_FOOD, "This is an apple.")).toBe(false);
    expect(isClozeDerivedSentence(A1_BREAKFAST_FOOD, "These are eggs.")).toBe(false);
  });
});

describe("isPictureDescriptionStatement", () => {
  it("accepts This is / These are only", () => {
    expect(isPictureDescriptionStatement("This is milk.")).toBe(true);
    expect(isPictureDescriptionStatement("These are eggs.")).toBe(true);
    expect(isPictureDescriptionStatement("I like apples.")).toBe(false);
    expect(isPictureDescriptionStatement("We drink milk for breakfast.")).toBe(false);
  });
});

describe("buildVocabTrueFalseStatement", () => {
  const seed = "tf-content-test";

  it("is stable for the same word and seed", () => {
    const apple = A1_BREAKFAST_FOOD.words.find((w) => w.id === "apple")!;
    const a = buildVocabTrueFalseStatement(A1_BREAKFAST_FOOD, apple, seed);
    const b = buildVocabTrueFalseStatement(A1_BREAKFAST_FOOD, apple, seed);
    expect(a).toEqual(b);
  });

  it("only emits This is / These are statements", () => {
    for (const w of A1_BREAKFAST_FOOD.words) {
      for (let i = 0; i < 12; i++) {
        const built = buildVocabTrueFalseStatement(
          A1_BREAKFAST_FOOD,
          w,
          `${seed}-${w.id}-${i}`,
        );
        expect(isPictureDescriptionStatement(built.statement), built.statement).toBe(true);
        expect(hasBrokenThisIsPattern(built.statement), built.statement).toBe(false);
        expect(isClozeDerivedSentence(A1_BREAKFAST_FOOD, built.statement), built.statement).toBe(
          false,
        );
        expect(built.pictureTruthStatement).toBe(thisLemmaStatement(w));
      }
    }
  });

  it("uses the target food image and picture truth line", () => {
    const apple = A1_BREAKFAST_FOOD.words.find((w) => w.id === "apple")!;
    const built = buildVocabTrueFalseStatement(A1_BREAKFAST_FOOD, apple, seed);
    expect(built.imageUrl).toBe(apple.imageUrl);
    expect(built.pictureTruthStatement).toBe("This is an apple.");
  });
});
