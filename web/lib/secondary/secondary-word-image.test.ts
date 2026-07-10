import { describe, expect, it } from "vitest";
import type { MediaRow } from "@/lib/teststartpage/media-asset-lookup";
import {
  getSecondaryWordMediaLookupInput,
  resolveSecondaryWordDisplayImageUrl,
  resolveSecondaryWordImageUrlFromRows,
  resolveSecondaryWordImageUrlSync,
} from "@/lib/secondary/secondary-word-image";
import type { SecondaryVocabItem } from "@/lib/secondary/types";

function sampleItem(overrides: Partial<SecondaryVocabItem> = {}): SecondaryVocabItem {
  return {
    wordItemId: "g7-a2-school-life-subject",
    packId: "g7-a2-complete-core-vocab-v1-2",
    topicId: "school-life",
    setId: "subjects-places-and-people",
    word: "subject",
    lemma: "subject",
    partOfSpeech: "noun",
    cefrLevel: "A2",
    gradeBand: "6-7",
    studentMeaningEn: "an area of study",
    vnMeaning: "mon hoc",
    exampleSentence: "Science is my favorite subject.",
    difficulty: 2,
    practiceTypes: ["matching"],
    tags: ["school"],
    ...overrides,
  };
}

describe("secondary-word-image", () => {
  it("returns explicit imageUrl without media lookup", () => {
    const item = sampleItem({ imageUrl: "https://cdn.example/subject.png" });
    expect(resolveSecondaryWordImageUrlSync(item)).toBe("https://cdn.example/subject.png");
    expect(resolveSecondaryWordImageUrlFromRows(item, [])).toBe("https://cdn.example/subject.png");
  });

  it("builds lookup keys from lemma, word, and mediaHint", () => {
    const input = getSecondaryWordMediaLookupInput(
      sampleItem({ mediaHint: "class subject", lemma: "subject" }),
    );
    expect(input.extraKeys).toContain("subject");
    expect(input.extraKeys).toContain("class subject");
    expect(input.topicSlugs).toContain("school");
  });

  it("returns topic web icon when no explicit imageUrl", () => {
    const url = resolveSecondaryWordDisplayImageUrl(sampleItem());
    expect(url).toContain("twemoji");
  });

  it("resolves from media rows when no explicit imageUrl", () => {
    const rows: MediaRow[] = [
      {
        public_url: "https://cdn.example/subject.jpg",
        meta_item_name: "subject",
        meta_categories: ["school"],
        meta_tags: null,
        meta_alternative_names: null,
        original_filename: "subject.jpg",
        created_at: "2026-01-01",
      },
    ];

    expect(resolveSecondaryWordImageUrlFromRows(sampleItem(), rows)).toBe(
      "https://cdn.example/subject.jpg",
    );
  });

  it("falls back to topic web icon when media lookup misses", () => {
    const url = resolveSecondaryWordImageUrlFromRows(sampleItem(), []);
    expect(url).toContain("twemoji");
  });
});
