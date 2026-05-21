import type { VocabSetId } from "@/lib/vocabulary-templates/types";

/**
 * Temporary: all Quick start activities stay unlocked regardless of player level.
 * Set to `false` before release to enforce {@link UNLOCK_REGISTRY} gates.
 */
export const UNLOCK_ALL_ACTIVITIES_DURING_DEV = true;

export type UnlockId =
  | "topic_quiz"
  | "vocab_sets_menu"
  | `vocab_set:${VocabSetId}`
  | "word_bucket_catch"
  | "chase_game"
  | "grammar_puppet";

export type UnlockEntry = {
  id: UnlockId;
  label: string;
  minLevel: number;
};

export const UNLOCK_REGISTRY: UnlockEntry[] = [
  { id: "topic_quiz", label: "Topic quiz", minLevel: 1 },
  { id: "vocab_sets_menu", label: "Vocabulary sets", minLevel: 1 },
  { id: "vocab_set:breakfast_food", label: "Breakfast Food set", minLevel: 1 },
  { id: "vocab_set:wild_animals", label: "Wild Animals set", minLevel: 1 },
  { id: "vocab_set:pets", label: "Pets set", minLevel: 1 },
  { id: "vocab_set:sea_animals", label: "Sea Animals set", minLevel: 1 },
  { id: "vocab_set:farm_animals", label: "Farm Animals set", minLevel: 1 },
  { id: "vocab_set:clothes_everyday", label: "Everyday Clothes set", minLevel: 1 },
  { id: "vocab_set:weather_words", label: "Weather Words set", minLevel: 1 },
  { id: "vocab_set:school_supplies", label: "School Supplies set", minLevel: 1 },
  { id: "vocab_set:school_activities", label: "School Activities set", minLevel: 1 },
  { id: "vocab_set:body_head_face", label: "Head & Face set", minLevel: 1 },
  { id: "vocab_set:body_limbs_inside", label: "Arms, Legs & Inside set", minLevel: 1 },
  { id: "vocab_set:jobs_community", label: "Community Jobs set", minLevel: 1 },
  { id: "vocab_set:jobs_creative", label: "More Jobs set", minLevel: 1 },
  { id: "vocab_set:toys_everyday", label: "Toys set", minLevel: 1 },
  { id: "vocab_set:food_fruit", label: "Fruit set", minLevel: 1 },
  { id: "vocab_set:food_meals", label: "Meals set", minLevel: 1 },
  { id: "vocab_set:food_snacks", label: "Snacks & Treats set", minLevel: 1 },
  { id: "word_bucket_catch", label: "Word bucket catch", minLevel: 2 },
  { id: "chase_game", label: "Chase game", minLevel: 3 },
  { id: "grammar_puppet", label: "Grammar puppet", minLevel: 5 },
];

export function getUnlockEntry(id: UnlockId): UnlockEntry | undefined {
  return UNLOCK_REGISTRY.find((u) => u.id === id);
}

export function minLevelForUnlock(id: UnlockId): number {
  return getUnlockEntry(id)?.minLevel ?? 1;
}

export function isUnlockAvailable(id: UnlockId, playerLevel: number): boolean {
  if (UNLOCK_ALL_ACTIVITIES_DURING_DEV) return true;
  return playerLevel >= minLevelForUnlock(id);
}

/** Unlocks whose `minLevel` equals `level` (for level-up fanfare). */
export function unlockLabelsAtLevel(level: number): string[] {
  return UNLOCK_REGISTRY.filter((u) => u.minLevel === level).map((u) => u.label);
}

export function nextLockedUnlocks(playerLevel: number): UnlockEntry[] {
  if (UNLOCK_ALL_ACTIVITIES_DURING_DEV) return [];
  return UNLOCK_REGISTRY.filter((u) => u.minLevel > playerLevel).sort(
    (a, b) => a.minLevel - b.minLevel,
  );
}
