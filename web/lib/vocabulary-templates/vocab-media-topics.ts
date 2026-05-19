import type { VocabSetId } from "./types";

/** `media_assets.meta_categories` slugs used when filtering library images per set. */
export const VOCAB_SET_MEDIA_TOPIC_SLUGS: Record<VocabSetId, readonly string[]> = {
  breakfast_food: ["food", "drinks"],
  wild_animals: ["animals"],
  pets: ["animals"],
  sea_animals: ["animals"],
  farm_animals: ["animals"],
};

/** Extra lookup strings when resolving set cover art from the library. */
export const VOCAB_SET_COVER_LOOKUP_KEYS: Partial<Record<VocabSetId, readonly string[]>> = {
  breakfast_food: ["breakfast", "food"],
  wild_animals: ["wild animals", "zoo", "wild"],
  pets: ["pets", "pet"],
  sea_animals: ["sea animals", "ocean", "sea"],
  farm_animals: ["farm animals", "farm"],
};
