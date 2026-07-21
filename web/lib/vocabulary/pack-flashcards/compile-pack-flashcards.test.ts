import { describe, expect, it } from "vitest";
import {
  compilePackFlashcards,
  createPackFlashcardDraft,
  flashcardFacePresence,
  flashcardLexemeReadinessLabel,
  missingFlashcardFaces,
  resolveFlashcardFaceValue,
  validatePackFlashcardOptions,
  type PackFlashcardLexemeSource,
  type PackFlashcardOptions,
} from "@/lib/vocabulary/pack-flashcards";

function lex(
  partial: Partial<PackFlashcardLexemeSource> &
    Pick<PackFlashcardLexemeSource, "id" | "lemma">,
): PackFlashcardLexemeSource {
  return {
    pos: "noun",
    primaryStageCandidate: "starter",
    primaryTopic: "animals",
    source: "teacher",
    archived: false,
    readyForClass: true,
    definitionEn: null,
    definitionVi: null,
    exampleSentence: null,
    pictureUrl: null,
    ...partial,
  };
}

const wordDefOptions: PackFlashcardOptions = {
  includeFaces: ["word", "definition"],
  frontFaces: ["word"],
  backFaces: ["definition"],
};

describe("validatePackFlashcardOptions", () => {
  it("accepts a valid partition", () => {
    const result = validatePackFlashcardOptions({
      includeFaces: ["picture", "word", "definition"],
      frontFaces: ["picture"],
      backFaces: ["definition", "word"],
      shuffle: true,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.options.includeFaces).toEqual(["word", "definition", "picture"]);
    expect(result.options.frontFaces).toEqual(["picture"]);
    expect(result.options.backFaces).toEqual(["word", "definition"]);
    expect(result.options.shuffle).toBe(true);
  });

  it("rejects fewer than two faces and overlap", () => {
    const tooFew = validatePackFlashcardOptions({
      includeFaces: ["word"],
      frontFaces: ["word"],
      backFaces: ["word"],
    });
    expect(tooFew.ok).toBe(false);

    const overlap = validatePackFlashcardOptions({
      includeFaces: ["word", "definition"],
      frontFaces: ["word", "definition"],
      backFaces: ["definition"],
    });
    expect(overlap.ok).toBe(false);
    if (overlap.ok) return;
    expect(overlap.errors.some((e) => /both sides/i.test(e))).toBe(true);
  });

  it("rejects uncovered included faces", () => {
    const result = validatePackFlashcardOptions({
      includeFaces: ["word", "definition", "example"],
      frontFaces: ["word"],
      backFaces: ["definition"],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((e) => /example/i.test(e))).toBe(true);
  });
});

describe("flashcard readiness", () => {
  it("resolves faces from lexeme and overrides", () => {
    const row = lex({
      id: "a",
      lemma: "cat",
      definitionEn: "a small pet",
      exampleSentence: "The cat sleeps.",
    });
    expect(resolveFlashcardFaceValue("word", row)).toBe("cat");
    expect(resolveFlashcardFaceValue("definition", row)).toBe("a small pet");
    expect(resolveFlashcardFaceValue("example", row)).toBe("The cat sleeps.");
    expect(resolveFlashcardFaceValue("picture", row)).toBeNull();
    expect(
      resolveFlashcardFaceValue("picture", row, {
        pictureUrl: "https://cdn.example/cat.png",
      }),
    ).toBe("https://cdn.example/cat.png");

    expect(flashcardFacePresence(row)).toEqual({
      word: true,
      definition: true,
      example: true,
      picture: false,
    });
    expect(missingFlashcardFaces(row, ["word", "picture"])).toEqual(["picture"]);
    expect(flashcardLexemeReadinessLabel(row, ["word", "definition"])).toBe("Ready");
    expect(flashcardLexemeReadinessLabel(row, ["word", "picture"])).toMatch(/Needs picture/);
  });
});

describe("compilePackFlashcards", () => {
  it("builds cards with frozen faces and front/back", () => {
    const draft = createPackFlashcardDraft({
      packId: "pack-1",
      packTitle: "Pets",
      wordIds: ["a", "b"],
      options: wordDefOptions,
    });
    const result = compilePackFlashcards({
      draft,
      lexemes: [
        lex({ id: "a", lemma: "cat", definitionEn: "a small pet that meows" }),
        lex({ id: "b", lemma: "dog", definitionEn: "a pet that barks" }),
      ],
      seed: "stable",
    });

    expect(result.cards).toHaveLength(2);
    expect(result.skippedWordIds).toEqual([]);
    expect(result.cards[0]).toMatchObject({
      wordId: "a",
      faces: { word: "cat", definition: "a small pet that meows" },
      frontFaces: ["word"],
      backFaces: ["definition"],
    });
    expect(result.cards[0]?.faces.example).toBeUndefined();
    expect(result.cards.map((c) => c.wordId)).toEqual(["a", "b"]);
  });

  it("keeps incomplete cards and warns for teacher edit", () => {
    const draft = createPackFlashcardDraft({
      packId: "p",
      packTitle: "t",
      wordIds: ["a", "b", "gone"],
      options: {
        includeFaces: ["word", "definition", "example"],
        frontFaces: ["word"],
        backFaces: ["definition", "example"],
      },
    });
    const result = compilePackFlashcards({
      draft,
      lexemes: [
        lex({
          id: "a",
          lemma: "cat",
          definitionEn: "meows",
          exampleSentence: "Cats meow.",
        }),
        lex({ id: "b", lemma: "dog", definitionEn: "barks" }),
      ],
      seed: "x",
    });

    expect(result.cards).toHaveLength(2);
    expect(result.cards.map((c) => c.wordId)).toEqual(["a", "b"]);
    expect(result.cards[1]?.faces).toEqual({
      word: "dog",
      definition: "barks",
      example: "",
    });
    expect(result.skippedWordIds).toEqual(["gone"]);
    expect(result.warnings.some((w) => /dog/i.test(w) && /example/i.test(w))).toBe(
      true,
    );
  });

  it("applies overrides to fill missing faces", () => {
    const draft = createPackFlashcardDraft({
      packId: "p",
      packTitle: "t",
      wordIds: ["a"],
      options: {
        includeFaces: ["word", "picture"],
        frontFaces: ["picture"],
        backFaces: ["word"],
      },
    });
    const result = compilePackFlashcards({
      draft,
      lexemes: [lex({ id: "a", lemma: "cat" })],
      overridesByWordId: new Map([
        ["a", { pictureUrl: "https://cdn.example/cat.png" }],
      ]),
    });

    expect(result.cards).toHaveLength(1);
    expect(result.cards[0]?.faces).toEqual({
      word: "cat",
      pictureUrl: "https://cdn.example/cat.png",
    });
    expect(result.cards[0]?.frontFaces).toEqual(["picture"]);
  });

  it("is seed-stable when shuffle is on", () => {
    const draft = createPackFlashcardDraft({
      packId: "p",
      packTitle: "t",
      wordIds: ["a", "b", "c", "d"],
      options: { ...wordDefOptions, shuffle: true },
    });
    const lexemes = [
      lex({ id: "a", lemma: "cat", definitionEn: "meows" }),
      lex({ id: "b", lemma: "dog", definitionEn: "barks" }),
      lex({ id: "c", lemma: "bird", definitionEn: "flies" }),
      lex({ id: "d", lemma: "fish", definitionEn: "swims" }),
    ];
    const a = compilePackFlashcards({ draft, lexemes, seed: "same" });
    const b = compilePackFlashcards({ draft, lexemes, seed: "same" });
    expect(a.cards.map((c) => c.id)).toEqual(b.cards.map((c) => c.id));
  });

  it("returns option errors without building cards", () => {
    const draft = createPackFlashcardDraft({
      packId: "p",
      packTitle: "t",
      wordIds: ["a"],
      options: {
        includeFaces: ["word"],
        frontFaces: ["word"],
        backFaces: ["word"],
      },
    });
    // Bypass createPackFlashcardDraft normalization path by forcing bad options
    draft.options = {
      includeFaces: ["word"],
      frontFaces: ["word"],
      backFaces: ["word"],
    };
    const result = compilePackFlashcards({
      draft,
      lexemes: [lex({ id: "a", lemma: "cat", definitionEn: "meows" })],
    });
    expect(result.cards).toEqual([]);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});
