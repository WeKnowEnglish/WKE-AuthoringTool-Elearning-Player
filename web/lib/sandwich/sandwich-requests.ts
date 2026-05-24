import {
  SANDWICH_INGREDIENT_IDS,
  getSandwichIngredient,
  type SandwichIngredientId,
} from "@/lib/sandwich/sandwich-ingredients";

export type SandwichRequestDisplay = {
  ingredientId: SandwichIngredientId;
  line: string;
  speakText: string;
  cueEmoji: string;
  highlightWord: string;
};

export function formatRequest(ingredientId: SandwichIngredientId): SandwichRequestDisplay {
  const item = getSandwichIngredient(ingredientId)!;
  const line = `I want some ${item.label}!`;
  return {
    ingredientId,
    line,
    speakText: line,
    cueEmoji: item.cueEmoji,
    highlightWord: item.label,
  };
}

/** Sample `count` ingredient ids without replacement. */
export function pickDistinctIngredients(
  count: number,
  random: () => number = Math.random,
): SandwichIngredientId[] {
  const pool = [...SANDWICH_INGREDIENT_IDS];
  const picked: SandwichIngredientId[] = [];
  while (picked.length < count && pool.length > 0) {
    const idx = Math.floor(random() * pool.length);
    picked.push(pool.splice(idx, 1)[0]!);
  }
  return picked;
}

export function createMainRequests(
  random: () => number = Math.random,
): [
  SandwichIngredientId,
  SandwichIngredientId,
  SandwichIngredientId,
  SandwichIngredientId,
] {
  const picked = pickDistinctIngredients(4, random);
  if (picked.length !== 4) {
    throw new Error("Not enough sandwich ingredients for a session");
  }
  return [picked[0]!, picked[1]!, picked[2]!, picked[3]!];
}
