import { describe, expect, it } from "vitest";
import {
  createBakeryVocabularyListDocument,
  createBlankVocabularyListDocument,
  validateVocabularyListDocument,
} from "@/lib/activity-builder/vocabulary-list/document";
import { addVocabEntry, removeVocabEntry } from "@/lib/activity-builder/vocabulary-list/editorOps";

describe("vocabulary list document", () => {
  it("validates blank and bakery starters", () => {
    expect(validateVocabularyListDocument(createBlankVocabularyListDocument()).entries).toHaveLength(
      1,
    );
    expect(validateVocabularyListDocument(createBakeryVocabularyListDocument()).entries).toHaveLength(
      4,
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
