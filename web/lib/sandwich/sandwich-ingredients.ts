export const SANDWICH_INGREDIENT_IDS = [
  "lettuce",
  "tomato",
  "onion",
  "cheese",
  "meat",
  "chicken",
  "mayonnaise",
  "ketchup",
  "hot_sauce",
] as const;

export type SandwichIngredientId = (typeof SANDWICH_INGREDIENT_IDS)[number];

export type SandwichIngredient = {
  id: SandwichIngredientId;
  label: string;
  ariaLabel: string;
  imageUrl: string;
  cueEmoji: string;
};

const SANDWICH_BASE = "/pet/sandwich";

export const SANDWICH_INGREDIENTS: SandwichIngredient[] = [
  {
    id: "lettuce",
    label: "lettuce",
    ariaLabel: "Lettuce",
    imageUrl: `${SANDWICH_BASE}/lettuce.svg`,
    cueEmoji: "🥬",
  },
  {
    id: "tomato",
    label: "tomato",
    ariaLabel: "Tomato",
    imageUrl: `${SANDWICH_BASE}/tomato.svg`,
    cueEmoji: "🍅",
  },
  {
    id: "onion",
    label: "onion",
    ariaLabel: "Onion",
    imageUrl: `${SANDWICH_BASE}/onion.svg`,
    cueEmoji: "🧅",
  },
  {
    id: "cheese",
    label: "cheese",
    ariaLabel: "Cheese",
    imageUrl: `${SANDWICH_BASE}/cheese.svg`,
    cueEmoji: "🧀",
  },
  {
    id: "meat",
    label: "meat",
    ariaLabel: "Meat",
    imageUrl: `${SANDWICH_BASE}/meat.svg`,
    cueEmoji: "🥩",
  },
  {
    id: "chicken",
    label: "chicken",
    ariaLabel: "Chicken",
    imageUrl: `${SANDWICH_BASE}/chicken.svg`,
    cueEmoji: "🍗",
  },
  {
    id: "mayonnaise",
    label: "mayonnaise",
    ariaLabel: "Mayonnaise",
    imageUrl: `${SANDWICH_BASE}/mayonnaise.svg`,
    cueEmoji: "🥄",
  },
  {
    id: "ketchup",
    label: "ketchup",
    ariaLabel: "Ketchup",
    imageUrl: `${SANDWICH_BASE}/ketchup.svg`,
    cueEmoji: "🍅",
  },
  {
    id: "hot_sauce",
    label: "hot sauce",
    ariaLabel: "Hot sauce",
    imageUrl: `${SANDWICH_BASE}/hot-sauce.svg`,
    cueEmoji: "🌶️",
  },
];

/** Fixed 3×3 tray order (positions never shuffle). */
export const SANDWICH_TRAY_INGREDIENTS: SandwichIngredient[] = SANDWICH_INGREDIENTS;

const INGREDIENT_BY_ID = new Map(SANDWICH_INGREDIENTS.map((i) => [i.id, i]));

export function getSandwichIngredient(
  id: string,
): SandwichIngredient | undefined {
  return INGREDIENT_BY_ID.get(id as SandwichIngredientId);
}

export function isSandwichIngredientId(value: string): value is SandwichIngredientId {
  return (SANDWICH_INGREDIENT_IDS as readonly string[]).includes(value);
}

export function ingredientMatches(
  pick: string,
  requestedId: SandwichIngredientId,
): boolean {
  return pick === requestedId;
}

export const SANDWICH_BOTTOM_BREAD_URL = `${SANDWICH_BASE}/bottom-bread.svg`;
export const SANDWICH_TOP_BREAD_URL = `${SANDWICH_BASE}/top-bread.svg`;
export const SANDWICH_PLATE_URL = `${SANDWICH_BASE}/plate.svg`;

/** All sandwich scene images for intro preload. */
export const SANDWICH_PRELOAD_URLS: string[] = [
  SANDWICH_BOTTOM_BREAD_URL,
  SANDWICH_TOP_BREAD_URL,
  SANDWICH_PLATE_URL,
  ...SANDWICH_INGREDIENTS.map((i) => i.imageUrl),
];
