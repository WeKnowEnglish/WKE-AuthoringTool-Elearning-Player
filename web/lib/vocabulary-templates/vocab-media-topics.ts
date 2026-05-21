import type { VocabSetId } from "./types";

/** `media_assets.meta_categories` slugs used when filtering library images per set. */
export const VOCAB_SET_MEDIA_TOPIC_SLUGS: Record<VocabSetId, readonly string[]> = {
  breakfast_food: ["food", "drinks"],
  wild_animals: ["animals"],
  pets: ["animals"],
  sea_animals: ["animals"],
  farm_animals: ["animals"],
  clothes_everyday: ["clothes"],
  weather_words: ["weather", "nature"],
  school_supplies: ["school", "clothes", "actions", "food", "home"],
  school_activities: ["actions", "toys", "misc"],
  body_head_face: ["body", "misc"],
  body_limbs_inside: ["body"],
  jobs_community: ["jobs", "people"],
  jobs_creative: ["jobs", "people"],
  toys_everyday: ["toys"],
  food_fruit: ["food"],
  food_meals: ["food"],
  food_snacks: ["food", "snacks", "desserts"],
};

/** Extra lookup strings when resolving set cover art from the library. */
export const VOCAB_SET_COVER_LOOKUP_KEYS: Partial<Record<VocabSetId, readonly string[]>> = {
  breakfast_food: ["breakfast", "food"],
  wild_animals: ["wild animals", "zoo", "wild"],
  pets: ["pets", "pet"],
  sea_animals: ["sea animals", "ocean", "sea"],
  farm_animals: ["farm animals", "farm"],
  clothes_everyday: ["clothes", "everyday clothes"],
  weather_words: ["weather", "sun"],
  school_supplies: ["school", "supplies", "classroom"],
  school_activities: ["school", "activities", "actions"],
  body_head_face: ["body", "head", "face"],
  body_limbs_inside: ["body", "limbs"],
  jobs_community: ["jobs", "community"],
  jobs_creative: ["jobs", "creative"],
  toys_everyday: ["toys", "games"],
  food_fruit: ["fruit", "food"],
  food_meals: ["meals", "food", "lunch"],
  food_snacks: ["snacks", "treats", "food"],
};
