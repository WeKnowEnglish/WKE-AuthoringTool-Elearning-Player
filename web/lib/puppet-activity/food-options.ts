import { BREAKFAST_FOOD_MEDIA_URLS } from "@/lib/vocabulary-templates/sets/breakfast-food-media";

export type PuppetFoodOption = {
  id: string;
  label: string;
  imageUrl: string;
};

function foodImageUrl(id: string, label: string): string {
  const fromMedia = (BREAKFAST_FOOD_MEDIA_URLS as Record<string, string | undefined>)[id];
  if (fromMedia?.trim()) return fromMedia.trim();
  return `https://placehold.co/400x400/fef3c7/92400e?text=${encodeURIComponent(label)}`;
}

/** Breakfast foods for puppet `choice` beats (shared art with vocab set). */
export const PUPPET_BREAKFAST_FOOD_OPTIONS: PuppetFoodOption[] = [
  { id: "bread", label: "bread", imageUrl: foodImageUrl("bread", "bread") },
  { id: "milk", label: "milk", imageUrl: foodImageUrl("milk", "milk") },
  { id: "juice", label: "juice", imageUrl: foodImageUrl("juice", "juice") },
  { id: "eggs", label: "eggs", imageUrl: foodImageUrl("eggs", "eggs") },
  { id: "apple", label: "apple", imageUrl: foodImageUrl("apple", "apple") },
  { id: "banana", label: "banana", imageUrl: foodImageUrl("banana", "banana") },
];

const BY_ID = new Map(PUPPET_BREAKFAST_FOOD_OPTIONS.map((o) => [o.id, o]));

export function getPuppetFoodOption(id: string): PuppetFoodOption | null {
  return BY_ID.get(id) ?? null;
}

export function resolvePuppetFoodOptions(ids: string[]): PuppetFoodOption[] {
  const out: PuppetFoodOption[] = [];
  for (const id of ids) {
    const opt = BY_ID.get(id);
    if (opt) out.push(opt);
  }
  return out;
}
