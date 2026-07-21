import { describe, expect, it } from "vitest";
import {
  collectPrimaryVocabularyFacets,
  getPrimaryVocabularyCandidateById,
  getPrimaryVocabularyCandidateDataset,
  getPrimaryVocabularySearchEntries,
  getPrimaryVocabularySearchEntryById,
  getPrimaryVocabularySearchIndex,
  searchPrimaryVocabularyIndex,
} from "./index";

describe("primary vocabulary candidates (slice 1)", () => {
  it("loads a slim search index with 2000 entries", () => {
    const index = getPrimaryVocabularySearchIndex();
    expect(index.schemaVersion).toBe(1);
    expect(index.publicationStatus).toBe("planning_only_not_production");
    expect(index.entryCount).toBe(2000);
    expect(index.entries).toHaveLength(2000);
  });

  it("looks up search rows by id", () => {
    const first = getPrimaryVocabularySearchEntries()[0]!;
    expect(getPrimaryVocabularySearchEntryById(first.id)).toEqual(first);
    expect(getPrimaryVocabularySearchEntryById("missing")).toBeUndefined();
  });

  it("filters by query, stage, topic, and pos", () => {
    const entries = getPrimaryVocabularySearchEntries();
    const fruitish = searchPrimaryVocabularyIndex(entries, {
      query: "apple",
      pos: "noun",
    });
    expect(fruitish.length).toBeGreaterThan(0);
    expect(fruitish.every((e) => e.pos === "noun")).toBe(true);
    expect(fruitish.some((e) => e.lemma.toLowerCase().includes("apple"))).toBe(true);

    const byTopicText = searchPrimaryVocabularyIndex(entries, { query: "animals" });
    expect(byTopicText.length).toBeGreaterThan(0);
    expect(
      byTopicText.every(
        (e) =>
          e.primaryTopic.toLowerCase().includes("animal") ||
          e.topics.some((t) => t.toLowerCase().includes("animal")) ||
          e.lemma.toLowerCase().includes("animal"),
      ),
    ).toBe(true);

    const staged = searchPrimaryVocabularyIndex(entries, {
      primaryStageCandidate: "A1_1",
      primaryTopic: "food_drink",
    });
    expect(staged.every((e) => e.primaryStageCandidate === "A1_1")).toBe(true);
    expect(staged.every((e) => e.primaryTopic === "food_drink")).toBe(true);
  });

  it("respects search limit", () => {
    const entries = getPrimaryVocabularySearchEntries();
    const limited = searchPrimaryVocabularyIndex(entries, { query: "a" }, { limit: 5 });
    expect(limited).toHaveLength(5);
  });

  it("exposes facets for filter UI", () => {
    const facets = collectPrimaryVocabularyFacets(getPrimaryVocabularySearchEntries());
    expect(facets.pos).toContain("noun");
    expect(facets.primaryStageCandidate).toContain("A1_1");
    expect(facets.primaryTopic.length).toBeGreaterThan(5);
  });

  it("loads full candidate entries by id without changing publication status", () => {
    const dataset = getPrimaryVocabularyCandidateDataset();
    expect(dataset.publicationStatus).toBe("planning_only_not_production");
    expect(dataset.entryCount).toBe(2000);

    const sampleId = getPrimaryVocabularySearchEntries()[0]!.id;
    const full = getPrimaryVocabularyCandidateById(sampleId);
    expect(full?.id).toBe(sampleId);
    expect(full?.lemma).toBeTruthy();
    expect(full?.review?.status).toBeTruthy();
  });
});
