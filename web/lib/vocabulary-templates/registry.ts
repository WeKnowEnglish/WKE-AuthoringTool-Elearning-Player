import { A1_BREAKFAST_FOOD } from "./sets/a1-breakfast-food";
import { A1_CLOTHES_EVERYDAY } from "./sets/a1-clothes-everyday";
import { A1_FARM_ANIMALS } from "./sets/a1-farm-animals";
import { A1_PETS } from "./sets/a1-pets";
import { A1_SEA_ANIMALS } from "./sets/a1-sea-animals";
import { A1_SCHOOL_ACTIVITIES } from "./sets/a1-school-activities";
import { A1_SCHOOL_SUPPLIES } from "./sets/a1-school-supplies";
import { A1_WEATHER_WORDS } from "./sets/a1-weather-words";
import { A1_WILD_ANIMALS } from "./sets/a1-wild-animals";
import { ANIMALS_HUB_COVER_URL } from "./sets/animals-media";
import { SCHOOL_HUB_COVER_URL } from "./sets/school-media";
import type { AnimalVocabSetId, SchoolVocabSetId, VocabSetId, VocabularySetDefinition } from "./types";
import { isVocabSetId } from "./types";

/** Top-level vocabulary menu (sets and hubs). */
export type VocabMenuEntry =
  | { kind: "set"; id: VocabSetId; label: string }
  | { kind: "hub"; hubId: "animals" | "school"; label: string; coverImageUrl: string; subtitle: string };

export const VOCAB_TOP_MENU: VocabMenuEntry[] = [
  { kind: "set", id: "breakfast_food", label: "Breakfast Food" },
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

/** @deprecated Use {@link VOCAB_TOP_MENU} — kept for tests expecting a flat set list. */
export const VOCAB_SET_MENU: { id: VocabSetId; label: string }[] = [
  { id: "breakfast_food", label: "Breakfast Food" },
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
