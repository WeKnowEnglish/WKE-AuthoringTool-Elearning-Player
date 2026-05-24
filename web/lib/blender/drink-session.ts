import { createMainRequests, type DrinkAdjective } from "@/lib/blender/drink-adjectives";
import { buildFixPrompt, type DrinkFixPrompt } from "@/lib/blender/drink-fix-prompts";
import { ingredientMatches } from "@/lib/blender/drink-ingredients";

export type DrinkSession = {
  requests: [DrinkAdjective, DrinkAdjective, DrinkAdjective];
};

export type MainRoundTier = "good" | "ok" | "bad";

export type MainRoundScore = {
  tier: MainRoundTier;
  matchCount: number;
  slotResults: [boolean, boolean, boolean];
  /** Set only when tier is `ok` (exactly one failed slot). */
  failedSlotIndex?: 0 | 1 | 2;
};

export type DrinkSessionPicks = [string, string, string];

export type FixRoundTier = "good" | "bad";

export function createDrinkSession(
  random: () => number = Math.random,
): DrinkSession {
  return { requests: createMainRequests(random) };
}

export function scoreSlot(pick: string, slotAdjective: DrinkAdjective): boolean {
  return ingredientMatches(pick, slotAdjective);
}

export function scoreMainRound(
  picks: DrinkSessionPicks,
  requests: DrinkSession["requests"],
): MainRoundScore {
  const slotResults = picks.map((pick, i) =>
    scoreSlot(pick, requests[i]!),
  ) as [boolean, boolean, boolean];

  const matchCount = slotResults.filter(Boolean).length;

  if (matchCount === 3) {
    return { tier: "good", matchCount, slotResults };
  }
  if (matchCount === 2) {
    const failedSlotIndex = slotResults.findIndex((ok) => !ok) as 0 | 1 | 2;
    return { tier: "ok", matchCount, slotResults, failedSlotIndex };
  }
  return { tier: "bad", matchCount, slotResults };
}

export function buildFixRoundContext(
  requests: DrinkSession["requests"],
  picks: DrinkSessionPicks,
  failedSlotIndex: 0 | 1 | 2,
): DrinkFixPrompt {
  const requested = requests[failedSlotIndex]!;
  const pickedIngredientId = picks[failedSlotIndex]!;
  return buildFixPrompt({ requested, pickedIngredientId });
}

export function scoreFixRound(
  pick: string,
  targetAdjective: DrinkAdjective,
): FixRoundTier {
  return ingredientMatches(pick, targetAdjective) ? "good" : "bad";
}

/** Tracks one-time ingredient use per session. */
export type DrinkIngredientTracker = {
  usedIngredientIds: ReadonlySet<string>;
};

export function createIngredientTracker(): DrinkIngredientTracker {
  return { usedIngredientIds: new Set() };
}

export function canPickIngredient(
  tracker: DrinkIngredientTracker,
  ingredientId: string,
): boolean {
  return !tracker.usedIngredientIds.has(ingredientId);
}

export function markIngredientUsed(
  tracker: DrinkIngredientTracker,
  ingredientId: string,
): DrinkIngredientTracker {
  const next = new Set(tracker.usedIngredientIds);
  next.add(ingredientId);
  return { usedIngredientIds: next };
}

export function availableIngredientIds(
  tracker: DrinkIngredientTracker,
  allIds: string[],
): string[] {
  return allIds.filter((id) => canPickIngredient(tracker, id));
}
