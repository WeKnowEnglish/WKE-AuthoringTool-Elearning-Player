import type { DrinkAdjective } from "@/lib/blender/drink-adjectives";

export type DrinkIngredient = {
  id: string;
  emoji: string;
  /** Screen-reader label (tray is emoji-only visually). */
  ariaLabel: string;
  tags: DrinkAdjective[];
};

export const DRINK_INGREDIENTS: DrinkIngredient[] = [
  { id: "orange", emoji: "🍊", ariaLabel: "Orange", tags: ["juicy", "sour"] },
  { id: "banana", emoji: "🍌", ariaLabel: "Banana", tags: ["sweet", "creamy"] },
  {
    id: "strawberry",
    emoji: "🍓",
    ariaLabel: "Strawberry",
    tags: ["red", "sweet", "juicy"],
  },
  { id: "blueberry", emoji: "🫐", ariaLabel: "Blueberry", tags: ["sweet"] },
  { id: "mango", emoji: "🥭", ariaLabel: "Mango", tags: ["juicy", "sweet"] },
  { id: "pineapple", emoji: "🍍", ariaLabel: "Pineapple", tags: ["juicy", "sour"] },
  {
    id: "watermelon",
    emoji: "🍉",
    ariaLabel: "Watermelon",
    tags: ["red", "sweet", "juicy"],
  },
  { id: "lemon", emoji: "🍋", ariaLabel: "Lemon", tags: ["sour", "juicy"] },
  { id: "apple", emoji: "🍎", ariaLabel: "Apple", tags: ["red", "sweet"] },
  { id: "grape", emoji: "🍇", ariaLabel: "Grape", tags: ["green", "sweet"] },
  { id: "sugar", emoji: "🧂", ariaLabel: "Sugar", tags: ["sweet"] },
  { id: "ice", emoji: "🧊", ariaLabel: "Ice", tags: ["cold"] },
];

const INGREDIENT_BY_ID = new Map(DRINK_INGREDIENTS.map((i) => [i.id, i]));

export function getDrinkIngredient(id: string): DrinkIngredient | undefined {
  return INGREDIENT_BY_ID.get(id);
}

export function getIngredientTags(id: string): DrinkAdjective[] {
  return getDrinkIngredient(id)?.tags ?? [];
}

export function ingredientMatches(id: string, adjective: DrinkAdjective): boolean {
  return getIngredientTags(id).includes(adjective);
}

const PINK_INGREDIENT_IDS = new Set(["strawberry", "blueberry", "watermelon"]);

/** Juice splash color from blender picks (no recipe required). */
export function resolveJuiceColorFromPicks(
  ingredientIds: string[],
): "orange" | "pink" {
  if (ingredientIds.length === 0) return "orange";
  const pinkCount = ingredientIds.filter((id) => PINK_INGREDIENT_IDS.has(id)).length;
  if (pinkCount * 2 >= ingredientIds.length) return "pink";
  return "orange";
}
