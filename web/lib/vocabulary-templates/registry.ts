import { A1_BREAKFAST_FOOD } from "./sets/a1-breakfast-food";
import { A1_FOOD_FRUIT } from "./sets/a1-food-fruit";
import { A1_FOOD_MEALS } from "./sets/a1-food-meals";
import { A1_FOOD_SNACKS } from "./sets/a1-food-snacks";
import { A1_CLOTHES_EVERYDAY } from "./sets/a1-clothes-everyday";
import { A1_FARM_ANIMALS } from "./sets/a1-farm-animals";
import { A1_PETS } from "./sets/a1-pets";
import { A1_SEA_ANIMALS } from "./sets/a1-sea-animals";
import { A1_BODY_HEAD_FACE } from "./sets/a1-body-head-face";
import { A1_BODY_LIMBS_INSIDE } from "./sets/a1-body-limbs-inside";
import { A1_JOBS_COMMUNITY } from "./sets/a1-jobs-community";
import { A1_JOBS_CREATIVE } from "./sets/a1-jobs-creative";
import { A1_SCHOOL_ACTIVITIES } from "./sets/a1-school-activities";
import { A1_SCHOOL_SUPPLIES } from "./sets/a1-school-supplies";
import { A1_TOYS_EVERYDAY } from "./sets/a1-toys-everyday";
import { A1_WEATHER_WORDS } from "./sets/a1-weather-words";
import { A1_WILD_ANIMALS } from "./sets/a1-wild-animals";
import { ANIMALS_HUB_COVER_URL } from "./sets/animals-media";
import { BODY_HUB_COVER_URL } from "./sets/body-media";
import { JOBS_HUB_COVER_URL } from "./sets/jobs-media";
import { FOOD_HUB_COVER_URL } from "./sets/food-media";
import { SCHOOL_HUB_COVER_URL } from "./sets/school-media";
import type {
  AnimalVocabSetId,
  BodyVocabSetId,
  FoodVocabSetId,
  JobsVocabSetId,
  SchoolVocabSetId,
  VocabSetId,
  VocabularySetDefinition,
} from "./types";
import { isVocabSetId } from "./types";

/** Top-level vocabulary menu (sets and hubs). */
export type VocabMenuEntry =
  | { kind: "set"; id: VocabSetId; label: string }
  | {
      kind: "hub";
      hubId: "animals" | "school" | "body" | "jobs" | "food";
      label: string;
      coverImageUrl: string;
      subtitle: string;
    };

export const VOCAB_TOP_MENU: VocabMenuEntry[] = [
  {
    kind: "hub",
    hubId: "food",
    label: "Food",
    coverImageUrl: FOOD_HUB_COVER_URL,
    subtitle: "Breakfast, fruit, meals, and snacks",
  },
  {
    kind: "hub",
    hubId: "animals",
    label: "Animals",
    coverImageUrl: ANIMALS_HUB_COVER_URL,
    subtitle: "Wild, pets, sea, and farm",
  },
  { kind: "set", id: "clothes_everyday", label: "Everyday Clothes" },
  { kind: "set", id: "weather_words", label: "Weather Words" },
  {
    kind: "hub",
    hubId: "school",
    label: "School",
    coverImageUrl: SCHOOL_HUB_COVER_URL,
    subtitle: "Supplies and activities",
  },
  {
    kind: "hub",
    hubId: "body",
    label: "Body Parts",
    coverImageUrl: BODY_HUB_COVER_URL,
    subtitle: "Head, face, and limbs",
  },
  {
    kind: "hub",
    hubId: "jobs",
    label: "Jobs",
    coverImageUrl: JOBS_HUB_COVER_URL,
    subtitle: "Community and more jobs",
  },
  { kind: "set", id: "toys_everyday", label: "Toys" },
];

export const ANIMALS_VOCAB_SET_MENU: { id: AnimalVocabSetId; label: string }[] = [
  { id: "wild_animals", label: "Wild Animals" },
  { id: "pets", label: "Pets" },
  { id: "sea_animals", label: "Sea Animals" },
  { id: "farm_animals", label: "Farm Animals" },
];

export const SCHOOL_VOCAB_SET_MENU: { id: SchoolVocabSetId; label: string }[] = [
  { id: "school_supplies", label: "Supplies & Subjects" },
  { id: "school_activities", label: "School Activities" },
];

export const BODY_VOCAB_SET_MENU: { id: BodyVocabSetId; label: string }[] = [
  { id: "body_head_face", label: "Head & Face" },
  { id: "body_limbs_inside", label: "Arms, Legs & Inside" },
];

export const JOBS_VOCAB_SET_MENU: { id: JobsVocabSetId; label: string }[] = [
  { id: "jobs_community", label: "Community Jobs" },
  { id: "jobs_creative", label: "More Jobs" },
];

export const FOOD_VOCAB_SET_MENU: { id: FoodVocabSetId; label: string }[] = [
  { id: "breakfast_food", label: "Breakfast Food" },
  { id: "food_fruit", label: "Fruit" },
  { id: "food_meals", label: "Meals" },
  { id: "food_snacks", label: "Snacks & Treats" },
];

/** @deprecated Use {@link VOCAB_TOP_MENU} — kept for tests expecting a flat set list. */
export const VOCAB_SET_MENU: { id: VocabSetId; label: string }[] = [
  ...FOOD_VOCAB_SET_MENU,
  ...ANIMALS_VOCAB_SET_MENU,
];

const SETS: Record<VocabSetId, VocabularySetDefinition> = {
  breakfast_food: A1_BREAKFAST_FOOD,
  wild_animals: A1_WILD_ANIMALS,
  pets: A1_PETS,
  sea_animals: A1_SEA_ANIMALS,
  farm_animals: A1_FARM_ANIMALS,
  clothes_everyday: A1_CLOTHES_EVERYDAY,
  weather_words: A1_WEATHER_WORDS,
  school_supplies: A1_SCHOOL_SUPPLIES,
  school_activities: A1_SCHOOL_ACTIVITIES,
  body_head_face: A1_BODY_HEAD_FACE,
  body_limbs_inside: A1_BODY_LIMBS_INSIDE,
  jobs_community: A1_JOBS_COMMUNITY,
  jobs_creative: A1_JOBS_CREATIVE,
  toys_everyday: A1_TOYS_EVERYDAY,
  food_fruit: A1_FOOD_FRUIT,
  food_meals: A1_FOOD_MEALS,
  food_snacks: A1_FOOD_SNACKS,
};

export function getVocabularySet(id: VocabSetId): VocabularySetDefinition {
  return SETS[id];
}

export function tryGetVocabularySet(id: string): VocabularySetDefinition | null {
  if (!isVocabSetId(id)) return null;
  return SETS[id];
}

export function vocabSetCoverImageSrc(setId: VocabSetId): string {
  return getVocabularySet(setId).coverImageUrl;
}
