import { describe, expect, it } from "vitest";
import {
  compileFlashcardsFromEntries,
  resolveFlashcardFacesForEntry,
} from "@/lib/activity-builder/games/compile-flashcards-from-entries";
import { createBakeryVocabularyListDocument } from "@/lib/activity-builder/vocabulary-list/document";
import { createHobbiesVocabularyListDocument } from "@/lib/learning-tracks/create-hobbies-vocabulary-list";

describe("resolveFlashcardFacesForEntry", () => {
  it("uses picture front and word+example back when all are available", () => {
    const faces = resolveFlashcardFacesForEntry(
      { frontFaces: ["picture"], backFaces: ["word", "example"] },
      ["word", "definition", "example", "picture"],
    );
    expect(faces).toEqual({
      frontFaces: ["picture"],
      backFaces: ["word", "example"],
    });
  });

  it("falls back when preferred front face is missing", () => {
    const faces = resolveFlashcardFacesForEntry(
      { frontFaces: ["picture"], backFaces: ["word", "example"] },
      ["word", "definition", "example"],
    );
    expect(faces?.frontFaces).toEqual(["definition"]);
    expect(faces?.backFaces).toEqual(["word", "example"]);
  });
});

describe("compileFlashcardsFromEntries", () => {
  it("defaults to picture front and word+example back for hobbies entries", () => {
    const list = createHobbiesVocabularyListDocument();
    const { document } = compileFlashcardsFromEntries(list, list.entries);
    expect(document.interaction.defaultFrontFaces).toEqual(["picture"]);
    expect(document.interaction.defaultBackFaces).toEqual(["word", "example"]);
    expect(document.interaction.shuffleCardsDefault).toBe(true);
    for (const card of document.interaction.cards) {
      expect(card.frontFaces).toEqual(["picture"]);
      expect(card.backFaces).toEqual(["word", "example"]);
    }
  });

  it("honors shuffleCards false", () => {
    const list = createHobbiesVocabularyListDocument();
    const { document } = compileFlashcardsFromEntries(
      list,
      list.entries,
      undefined,
      { shuffleCards: false },
    );
    expect(document.interaction.shuffleCardsDefault).toBe(false);
  });

  it("still compiles bakery entries without pictures", () => {
    const list = createBakeryVocabularyListDocument();
    const { document } = compileFlashcardsFromEntries(list, list.entries);
    expect(document.interaction.cards).toHaveLength(4);
    expect(document.interaction.cards[0]?.frontFaces).toEqual(["definition"]);
    expect(document.interaction.cards[0]?.backFaces).toEqual(["word", "example"]);
  });

  it("maps word, example, and definition audio onto cards", () => {
    const list = createBakeryVocabularyListDocument();
    list.entries[0] = {
      ...list.entries[0]!,
      audioUrl: "https://cdn.example/bread.m4a",
      exampleAudioUrl: "https://cdn.example/bread-example.m4a",
      definitionAudioUrl: "https://cdn.example/bread-def.m4a",
    };
    const { document } = compileFlashcardsFromEntries(list, list.entries);
    const card = document.interaction.cards[0];
    expect(card?.promptAudioUrl).toBe("https://cdn.example/bread.m4a");
    expect(card?.exampleAudioUrl).toBe("https://cdn.example/bread-example.m4a");
    expect(card?.definitionAudioUrl).toBe("https://cdn.example/bread-def.m4a");
  });
});
