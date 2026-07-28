import { describe, expect, it } from "vitest";
import { QUESTIONS_POSTER_SLUG } from "../catalog-schema";
import {
  getCanonicalGrammarPosterVariation,
  getGrammarPosterVariationBySlug,
  getGrammarPosterVariations,
  groupGrammarPosterVariationsByTopic,
} from "./grammar-poster-variations";

describe("grammar-poster-variations", () => {
  it("lists all published posters as variations", () => {
    const variations = getGrammarPosterVariations();

    expect(variations.length).toBeGreaterThanOrEqual(8);
    expect(variations.every((entry) => entry.slug.length > 0)).toBe(true);
    expect(variations.filter((entry) => entry.canonical)).toHaveLength(1);
  });

  it("marks there-is questions as the canonical Grammar Poster variation", () => {
    const canonical = getCanonicalGrammarPosterVariation();

    expect(canonical.slug).toBe(QUESTIONS_POSTER_SLUG);
    expect(canonical.canonical).toBe(true);
    expect(canonical.pageLayout).toBe("two-equal-then-full");
    expect(canonical.layoutTypes).toEqual(["two-equal", "full-width", "banner"]);
  });

  it("looks up a variation by slug with layout fingerprint", () => {
    const shortAnswers = getGrammarPosterVariationBySlug("short-answers-there-is-a1");

    expect(shortAnswers?.title).toContain("Short Answers");
    expect(shortAnswers?.layoutTypes).toContain("two-column-positive-negative");
    expect(shortAnswers?.layoutTypes).toContain("summary-grid");
    expect(shortAnswers?.canonical).toBe(false);
  });

  it("groups variations by topic with canonical first overall sort preserved", () => {
    const groups = groupGrammarPosterVariationsByTopic();
    const thereIs = groups.find((group) => group.groupId === "there-is-there-are");

    expect(thereIs?.variations[0]?.slug).toBe(QUESTIONS_POSTER_SLUG);
    expect(groups.some((group) => group.groupId === "nouns")).toBe(true);
  });
});
