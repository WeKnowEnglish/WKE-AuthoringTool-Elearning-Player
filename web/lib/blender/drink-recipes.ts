import type { JuiceColor } from "./types";

export type DrinkRecipe = {
  id: string;
  label: string;
  prompt: string;
  requiredFruitIds: string[];
  juiceColor: JuiceColor;
};

export const DRINK_RECIPES: DrinkRecipe[] = [
  {
    id: "orange_juice",
    label: "Orange Juice",
    prompt: "a sunny orange juice",
    requiredFruitIds: ["orange", "banana"],
    juiceColor: "orange",
  },
  {
    id: "berry_smoothie",
    label: "Berry Smoothie",
    prompt: "a sweet berry smoothie",
    requiredFruitIds: ["strawberry", "blueberry"],
    juiceColor: "pink",
  },
  {
    id: "tropical_blend",
    label: "Tropical Blend",
    prompt: "a tropical fruit blend",
    requiredFruitIds: ["mango", "pineapple"],
    juiceColor: "orange",
  },
  {
    id: "pink_paradise",
    label: "Pink Paradise",
    prompt: "a pink paradise drink",
    requiredFruitIds: ["strawberry", "watermelon"],
    juiceColor: "pink",
  },
  {
    id: "citrus_fizz",
    label: "Citrus Fizz",
    prompt: "a zesty citrus fizz",
    requiredFruitIds: ["lemon", "orange"],
    juiceColor: "orange",
  },
];

const LAST_RECIPE_KEY = "pet:lastDrinkRecipeId";

export type FruitTrayItem = {
  id: string;
  label: string;
  emoji: string;
};

/** Fruits available in the tray (includes decoys). */
export const FRUIT_TRAY: FruitTrayItem[] = [
  { id: "orange", label: "Orange", emoji: "🍊" },
  { id: "banana", label: "Banana", emoji: "🍌" },
  { id: "strawberry", label: "Strawberry", emoji: "🍓" },
  { id: "blueberry", label: "Blueberry", emoji: "🫐" },
  { id: "mango", label: "Mango", emoji: "🥭" },
  { id: "pineapple", label: "Pineapple", emoji: "🍍" },
  { id: "watermelon", label: "Watermelon", emoji: "🍉" },
  { id: "lemon", label: "Lemon", emoji: "🍋" },
  { id: "apple", label: "Apple", emoji: "🍎" },
  { id: "grape", label: "Grape", emoji: "🍇" },
];

function multisetEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const counts = new Map<string, number>();
  for (const id of a) counts.set(id, (counts.get(id) ?? 0) + 1);
  for (const id of b) {
    const n = counts.get(id);
    if (!n) return false;
    if (n === 1) counts.delete(id);
    else counts.set(id, n - 1);
  }
  return counts.size === 0;
}

export function recipeMatchesFruits(
  recipe: DrinkRecipe,
  blenderFruitIds: string[],
): boolean {
  return multisetEqual(recipe.requiredFruitIds, blenderFruitIds);
}

/** Picks a recipe, avoiding the last session pick when possible. */
export function pickRecipeForSession(
  random = Math.random,
): DrinkRecipe {
  if (typeof sessionStorage === "undefined") {
    const idx = Math.floor(random() * DRINK_RECIPES.length);
    return DRINK_RECIPES[idx]!;
  }
  const lastId = sessionStorage.getItem(LAST_RECIPE_KEY);
  const pool =
    lastId && DRINK_RECIPES.length > 1 ?
      DRINK_RECIPES.filter((r) => r.id !== lastId)
    : DRINK_RECIPES;
  const recipe = pool[Math.floor(random() * pool.length)]!;
  sessionStorage.setItem(LAST_RECIPE_KEY, recipe.id);
  return recipe;
}

const PINK_FRUIT_IDS = new Set(["strawberry", "blueberry", "watermelon"]);

/** Always returns orange or pink so splash art can play. */
export function resolveJuiceColor(
  recipe: DrinkRecipe,
  blenderFruitIds: string[] = [],
): JuiceColor {
  if (recipe.juiceColor === "orange" || recipe.juiceColor === "pink") {
    return recipe.juiceColor;
  }

  if (blenderFruitIds.length > 0) {
    const pinkCount = blenderFruitIds.filter((id) => PINK_FRUIT_IDS.has(id)).length;
    if (pinkCount * 2 >= blenderFruitIds.length) return "pink";
  }

  return "orange";
}
