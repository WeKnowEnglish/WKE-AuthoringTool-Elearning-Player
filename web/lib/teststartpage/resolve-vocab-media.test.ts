import { describe, expect, it } from "vitest";
import type { MediaRow } from "./media-asset-lookup";
import {
  mediaLookupKeysForVocabWord,
  pickBestMediaUrlForVocabWord,
} from "./media-asset-lookup";

function row(partial: Partial<MediaRow> & { public_url: string }): MediaRow {
  return {
    meta_item_name: null,
    meta_categories: null,
    meta_tags: null,
    meta_alternative_names: null,
    original_filename: "",
    created_at: "",
    ...partial,
  };
}

describe("resolve-vocab-media", () => {
  const mediaRows: MediaRow[] = [
    row({
      public_url: "https://cdn.example/lion.png",
      meta_item_name: "lion",
      meta_categories: ["animals"],
    }),
    row({
      public_url: "https://cdn.example/tiger.png",
      meta_item_name: "tiger",
      meta_categories: ["animals"],
    }),
    row({
      public_url: "https://cdn.example/bread.png",
      meta_item_name: "bread",
      meta_categories: ["food"],
    }),
  ];

  it("builds lookup keys from id and lemma variants", () => {
    expect(mediaLookupKeysForVocabWord({ id: "guinea_pig", lemma: "guineapig" })).toEqual(
      expect.arrayContaining(["guinea_pig", "guineapig", "guinea pig"]),
    );
  });

  it("picks animal images and respects topic slugs", () => {
    const hit = pickBestMediaUrlForVocabWord(
      { id: "lion", lemma: "lion", topicSlugs: ["animals"] },
      mediaRows,
    );
    expect(hit).toBe("https://cdn.example/lion.png");
  });

  it("does not return food-tagged media for animal-only filter", () => {
    const hit = pickBestMediaUrlForVocabWord(
      { id: "bread", lemma: "bread", topicSlugs: ["animals"] },
      mediaRows,
    );
    expect(hit).toBeNull();
  });
});
