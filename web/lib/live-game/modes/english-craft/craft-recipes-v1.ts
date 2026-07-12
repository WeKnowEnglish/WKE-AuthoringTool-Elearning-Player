import type { LiveGameCraftedItems, LiveGameResourcePool, LiveGameResourceType } from "@/lib/live-game/liveblocks/config";
import type { LiveGameStorageSnapshot } from "@/lib/live-game/liveblocks/config";
import {
  ENGLISH_CRAFT_BOAT_HAMMER_GOAL,
  ENGLISH_CRAFT_BOAT_POOL_COSTS,
  ENGLISH_CRAFT_CRAFT_QUESTION_ID,
  ENGLISH_CRAFT_HAMMER_COSTS,
} from "@/lib/live-game/modes/english-craft/gameplay-v1";
import { readResourcePool } from "@/lib/live-game/resource-pool";
import { readCraftedItems } from "@/lib/live-game/server/read-crafted-items";

export type CraftRecipeId = "build_bench" | "craft_hammer" | "craft_boat";

export type CraftRecipePoolCost = Partial<LiveGameResourcePool>;

export type CraftRecipeGrants = {
  benchBuilt?: true;
  hammers?: number;
  boat?: true;
  breadToCrafter?: number;
};

export type CraftRecipeRequires = {
  benchBuilt?: true;
  benchNotBuilt?: true;
  boatNotBuilt?: true;
  maxHammers?: number;
};

export type CraftRecipe = {
  id: CraftRecipeId;
  label: string;
  poolCost: CraftRecipePoolCost;
  craftedCost?: { hammers?: number };
  grants: CraftRecipeGrants;
  requires: CraftRecipeRequires;
  questionId: string;
};

export type CraftRecipeMissing = LiveGameResourceType | "hammers";

export const ENGLISH_CRAFT_BUILD_BENCH_COSTS = {
  wood: 10,
  stone: 5,
} as const;

export const ENGLISH_CRAFT_BUILD_BENCH_RECIPE: CraftRecipe = {
  id: "build_bench",
  label: "Build workbench",
  poolCost: { ...ENGLISH_CRAFT_BUILD_BENCH_COSTS },
  grants: { benchBuilt: true },
  requires: { benchNotBuilt: true },
  questionId: ENGLISH_CRAFT_CRAFT_QUESTION_ID,
};

export const ENGLISH_CRAFT_CRAFT_HAMMER_RECIPE: CraftRecipe = {
  id: "craft_hammer",
  label: "Craft hammer",
  poolCost: { ...ENGLISH_CRAFT_HAMMER_COSTS },
  grants: { hammers: 1 },
  requires: { benchBuilt: true, boatNotBuilt: true },
  questionId: ENGLISH_CRAFT_CRAFT_QUESTION_ID,
};

export const ENGLISH_CRAFT_CRAFT_BOAT_RECIPE: CraftRecipe = {
  id: "craft_boat",
  label: "Craft boat",
  poolCost: { ...ENGLISH_CRAFT_BOAT_POOL_COSTS },
  craftedCost: { hammers: ENGLISH_CRAFT_BOAT_HAMMER_GOAL },
  grants: { boat: true },
  requires: { benchBuilt: true, boatNotBuilt: true },
  questionId: ENGLISH_CRAFT_CRAFT_QUESTION_ID,
};

const BENCH_CRAFT_RECIPE_IDS: CraftRecipeId[] = ["craft_hammer", "craft_boat"];

const CRAFT_RECIPES: Record<CraftRecipeId, CraftRecipe> = {
  build_bench: ENGLISH_CRAFT_BUILD_BENCH_RECIPE,
  craft_hammer: ENGLISH_CRAFT_CRAFT_HAMMER_RECIPE,
  craft_boat: ENGLISH_CRAFT_CRAFT_BOAT_RECIPE,
};

export function getCraftRecipe(recipeId: CraftRecipeId): CraftRecipe {
  return CRAFT_RECIPES[recipeId];
}

export function isCraftRecipeId(value: string): value is CraftRecipeId {
  return value in CRAFT_RECIPES;
}

export function canAffordRecipePoolCost(
  pool: LiveGameResourcePool,
  recipe: CraftRecipe,
): boolean {
  return (Object.keys(recipe.poolCost) as LiveGameResourceType[]).every(
    (type) => pool[type] >= (recipe.poolCost[type] ?? 0),
  );
}

export function canAffordRecipeCraftedCost(
  crafted: LiveGameCraftedItems,
  recipe: CraftRecipe,
): boolean {
  const hammerCost = recipe.craftedCost?.hammers ?? 0;
  return hammerCost === 0 || crafted.hammers >= hammerCost;
}

export function missingRecipePoolResources(
  pool: LiveGameResourcePool,
  recipe: CraftRecipe,
): LiveGameResourceType[] {
  return (Object.keys(recipe.poolCost) as LiveGameResourceType[]).filter(
    (type) => pool[type] < (recipe.poolCost[type] ?? 0),
  );
}

export function missingRecipeCraftedResources(
  crafted: LiveGameCraftedItems,
  recipe: CraftRecipe,
): Array<"hammers"> {
  const hammerCost = recipe.craftedCost?.hammers ?? 0;
  if (hammerCost > 0 && crafted.hammers < hammerCost) return ["hammers"];
  return [];
}

export function missingRecipeRequirements(
  pool: LiveGameResourcePool,
  crafted: LiveGameCraftedItems,
  recipe: CraftRecipe,
): CraftRecipeMissing[] {
  return [
    ...missingRecipePoolResources(pool, recipe),
    ...missingRecipeCraftedResources(crafted, recipe),
  ];
}

export function formatMissingRecipeResources(
  types: readonly CraftRecipeMissing[],
  recipe: CraftRecipe,
): string {
  if (types.length === 0) return `Team needs more resources for ${recipe.label.toLowerCase()}.`;
  if (types.length === 1 && types[0] === "hammers") {
    return `Need more hammers to ${recipe.label.toLowerCase()}.`;
  }
  if (types.length === 1 && types[0] !== "hammers") {
    return `Need more ${types[0]} to ${recipe.label.toLowerCase()}.`;
  }
  const poolTypes = types.filter((type): type is LiveGameResourceType => type !== "hammers");
  const hasHammers = types.includes("hammers");
  if (hasHammers && poolTypes.length === 0) {
    return `Need more hammers to ${recipe.label.toLowerCase()}.`;
  }
  if (hasHammers && poolTypes.length > 0) {
    const head = poolTypes.slice(0, -1).join(", ");
    const tail = poolTypes[poolTypes.length - 1];
    const resourcePart =
      poolTypes.length === 1 ?
        `more ${tail}`
      : `more ${head} and ${tail}`;
    return `Need ${resourcePart} and more hammers to ${recipe.label.toLowerCase()}.`;
  }
  const head = poolTypes.slice(0, -1).join(", ");
  const tail = poolTypes[poolTypes.length - 1];
  return `Need more ${head} and ${tail} to ${recipe.label.toLowerCase()}.`;
}

export function formatRecipeCostSummary(recipe: CraftRecipe): string {
  const parts = (Object.keys(recipe.poolCost) as LiveGameResourceType[])
    .filter((type) => (recipe.poolCost[type] ?? 0) > 0)
    .map((type) => `${recipe.poolCost[type]} ${type}`);
  return parts.join(" · ");
}

export function formatRecipeFullCostSummary(recipe: CraftRecipe): string {
  const parts: string[] = [];
  if (recipe.craftedCost?.hammers != null && recipe.craftedCost.hammers > 0) {
    parts.push(`${recipe.craftedCost.hammers} hammers`);
  }
  const poolSummary = formatRecipeCostSummary(recipe);
  if (poolSummary) parts.push(poolSummary);
  return parts.join(" · ");
}

function meetsRecipeRequires(
  crafted: ReturnType<typeof readCraftedItems>,
  requires: CraftRecipeRequires,
): boolean {
  if (requires.benchNotBuilt && crafted.benchBuilt) return false;
  if (requires.benchBuilt && !crafted.benchBuilt) return false;
  if (requires.boatNotBuilt && crafted.boat) return false;
  if (requires.maxHammers != null && crafted.hammers >= requires.maxHammers) return false;
  return true;
}

export function canStartRecipeCraft(
  storage: LiveGameStorageSnapshot | null | undefined,
  recipeId: CraftRecipeId,
): boolean {
  if (!storage?.session || storage.session.phase !== "playing") return false;
  const recipe = getCraftRecipe(recipeId);
  const crafted = readCraftedItems(storage);
  if (!meetsRecipeRequires(crafted, recipe.requires)) return false;
  const pool = readResourcePool(storage);
  if (!canAffordRecipePoolCost(pool, recipe)) return false;
  if (!canAffordRecipeCraftedCost(crafted, recipe)) return false;
  return true;
}

export function canCraftAtBench(
  storage: LiveGameStorageSnapshot | null | undefined,
): boolean {
  if (!storage?.session || storage.session.phase !== "playing") return false;
  const crafted = readCraftedItems(storage);
  return crafted.benchBuilt && !crafted.boat;
}

export function listAvailableCraftRecipes(
  storage: LiveGameStorageSnapshot | null | undefined,
): CraftRecipe[] {
  return (Object.keys(CRAFT_RECIPES) as CraftRecipeId[])
    .filter((recipeId) => canStartRecipeCraft(storage, recipeId))
    .map((recipeId) => getCraftRecipe(recipeId));
}

export function listBenchCraftRecipes(
  storage: LiveGameStorageSnapshot | null | undefined,
): CraftRecipe[] {
  if (!canCraftAtBench(storage)) return [];
  return BENCH_CRAFT_RECIPE_IDS.map((recipeId) => getCraftRecipe(recipeId));
}

export function getDefaultBenchRecipe(
  storage: LiveGameStorageSnapshot | null | undefined,
): CraftRecipeId | null {
  if (canStartRecipeCraft(storage, "craft_hammer")) return "craft_hammer";
  if (canStartRecipeCraft(storage, "craft_boat")) return "craft_boat";
  return null;
}

export function canBuildBench(storage: LiveGameStorageSnapshot | null | undefined): boolean {
  return canStartRecipeCraft(storage, "build_bench");
}

export function getRecipeDisabledReason(
  pool: LiveGameResourcePool,
  crafted: LiveGameCraftedItems,
  recipe: CraftRecipe,
): string | null {
  const missing = missingRecipeRequirements(pool, crafted, recipe);
  if (missing.length === 0) return null;
  return formatMissingRecipeResources(missing, recipe);
}
