import { describe, expect, it } from "vitest";
import {
  applyMasterOverrides,
  entryMatchesTopicFilter,
  normalizeTopicTag,
  parseTopicsInput,
} from "@/lib/vocabulary/platform-lexicon";
import { getPrimaryVocabularySearchEntries } from "@/lib/vocabulary/primary-candidates";

describe("master lexicon overrides", () => {
  it("normalizes topic tags", () => {
    expect(normalizeTopicTag("Animals Nature")).toBe("animals_nature");
    expect(normalizeTopicTag("  pets!! ")).toBe("pets");
    expect(parseTopicsInput("animals, pets; Animals")).toEqual(["animals", "pets"]);
  });

  it("applies topic overrides onto search rows", () => {
    const cat = getPrimaryVocabularySearchEntries().find((e) => e.lemma === "cat");
    expect(cat).toBeTruthy();
    const merged = applyMasterOverrides([cat!], [
      {
        id: cat!.id,
        primaryTopic: "animals_nature",
        topics: ["animals_nature", "pets"],
        primaryStage: null,
      },
    ]);
    expect(merged[0]).toMatchObject({
      id: cat!.id,
      primaryTopic: "animals_nature",
      topics: ["animals_nature", "pets"],
    });
  });

  it("matches topic filters after override", () => {
    const cat = getPrimaryVocabularySearchEntries().find((e) => e.lemma === "cat")!;
    const overridden = applyMasterOverrides([cat], [
      {
        id: cat.id,
        primaryTopic: "animals_nature",
        topics: ["animals_nature"],
        primaryStage: null,
      },
    ])[0]!;
    expect(entryMatchesTopicFilter(overridden, "animals", "contains")).toBe(true);
    expect(entryMatchesTopicFilter(cat, "animals", "contains")).toBe(false);
  });
});
