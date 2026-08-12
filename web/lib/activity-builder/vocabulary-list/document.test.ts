import { describe, expect, it } from "vitest";
import {
  createBakeryVocabularyListDocument,
  createBlankVocabularyListDocument,
  validateVocabularyListDocument,
} from "@/lib/activity-builder/vocabulary-list/document";
import { addVocabEntry, removeVocabEntry } from "@/lib/activity-builder/vocabulary-list/editorOps";

describe("vocabulary list document", () => {
  it("validates blank and bakery starters", () => {
    // Blank starts with an empty row for typing; not saveable until a lemma is entered.
    expect(() =>
      validateVocabularyListDocument(createBlankVocabularyListDocument()),
    ).toThrow(/at least one word/i);
    expect(validateVocabularyListDocument(createBakeryVocabularyListDocument()).entries).toHaveLength(
      4,
    );
  });

  it("allows empty draft rows when another word is filled", () => {
    const doc = validateVocabularyListDocument({
      version: 1,
      kind: "vocabulary-list",
      id: "x",
      name: "X",
      entries: [
        { id: "v1", word: "bread" },
        { id: "v2", word: "" },
      ],
    });
    expect(doc.entries).toHaveLength(2);
    expect(doc.entries[1]?.word).toBe("");
  });

  it("parses example and definition audio urls", () => {
    const doc = validateVocabularyListDocument({
      version: 1,
      kind: "vocabulary-list",
      id: "x",
      name: "X",
      entries: [
        {
          id: "v1",
          word: "bread",
          audioUrl: "https://cdn.example/word.m4a",
          exampleAudioUrl: "https://cdn.example/example.m4a",
          definitionAudioUrl: "https://cdn.example/definition.m4a",
        },
      ],
    });
    expect(doc.entries[0]?.audioUrl).toBe("https://cdn.example/word.m4a");
    expect(doc.entries[0]?.exampleAudioUrl).toBe("https://cdn.example/example.m4a");
    expect(doc.entries[0]?.definitionAudioUrl).toBe(
      "https://cdn.example/definition.m4a",
    );
  });

  it("rejects empty entries", () => {
    expect(() =>
      validateVocabularyListDocument({
        version: 1,
        kind: "vocabulary-list",
        id: "x",
        name: "X",
        entries: [],
      }),
    ).toThrow(/at least one/i);
  });

  it("adds and removes words with a floor of one", () => {
    let doc = createBlankVocabularyListDocument();
    doc = addVocabEntry(doc);
    expect(doc.entries).toHaveLength(2);
    doc = removeVocabEntry(doc, doc.entries[0]!.id);
    expect(doc.entries).toHaveLength(1);
    expect(() => removeVocabEntry(doc, doc.entries[0]!.id)).toThrow(/at least one/i);
  });
});
