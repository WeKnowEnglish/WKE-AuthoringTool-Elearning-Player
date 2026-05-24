import { createMainRequests } from "@/lib/sandwich/sandwich-requests";
import { buildFixPrompt, type SandwichFixPrompt } from "@/lib/sandwich/sandwich-fix-prompts";
import {
  ingredientMatches,
  type SandwichIngredientId,
} from "@/lib/sandwich/sandwich-ingredients";

export type SandwichSession = {
  requests: [
    SandwichIngredientId,
    SandwichIngredientId,
    SandwichIngredientId,
    SandwichIngredientId,
  ];
};

export type MainRoundTier = "good" | "ok" | "bad";

export type SandwichSlotIndex = 0 | 1 | 2 | 3;

export type MainRoundScore = {
  tier: MainRoundTier;
  matchCount: number;
  slotResults: [boolean, boolean, boolean, boolean];
  /** Last wrong layer when tier is `ok`. */
  failedSlotIndex?: SandwichSlotIndex;
};

export type SandwichSessionPicks = [string, string, string, string];

export type FixRoundTier = "good" | "bad";

export function createSandwichSession(
  random: () => number = Math.random,
): SandwichSession {
  return { requests: createMainRequests(random) };
}

export function scoreSlot(
  pick: string,
  slotIngredientId: SandwichIngredientId,
): boolean {
  return ingredientMatches(pick, slotIngredientId);
}

/** Highest index where the pick did not match the request. */
export function lastFailedSlotIndex(
  slotResults: [boolean, boolean, boolean, boolean],
): SandwichSlotIndex | undefined {
  for (let i = slotResults.length - 1; i >= 0; i--) {
    if (!slotResults[i]) return i as SandwichSlotIndex;
  }
  return undefined;
}

export function scoreMainRound(
  picks: SandwichSessionPicks,
  requests: SandwichSession["requests"],
): MainRoundScore {
  const slotResults = picks.map((pick, i) =>
    scoreSlot(pick, requests[i]!),
  ) as [boolean, boolean, boolean, boolean];

  const matchCount = slotResults.filter(Boolean).length;

  if (matchCount === 4) {
    return { tier: "good", matchCount, slotResults };
  }
  if (matchCount === 2 || matchCount === 3) {
    const failedSlotIndex = lastFailedSlotIndex(slotResults)!;
    return { tier: "ok", matchCount, slotResults, failedSlotIndex };
  }
  return { tier: "bad", matchCount, slotResults };
}

export function buildFixRoundContext(
  requests: SandwichSession["requests"],
  picks: SandwichSessionPicks,
  failedSlotIndex: SandwichSlotIndex,
): SandwichFixPrompt {
  const requested = requests[failedSlotIndex]!;
  const pickedIngredientId = picks[failedSlotIndex]!;
  return buildFixPrompt({ requested, pickedIngredientId });
}

export function scoreFixRound(
  pick: string,
  targetIngredientId: SandwichIngredientId,
): FixRoundTier {
  return ingredientMatches(pick, targetIngredientId) ? "good" : "bad";
}

/** Tracks one-time ingredient use per session (wrong picks stay locked). */
export type SandwichIngredientTracker = {
  usedIngredientIds: ReadonlySet<string>;
};

export function createIngredientTracker(): SandwichIngredientTracker {
  return { usedIngredientIds: new Set() };
}

export function canPickIngredient(
  tracker: SandwichIngredientTracker,
  ingredientId: string,
): boolean {
  return !tracker.usedIngredientIds.has(ingredientId);
}

export function markIngredientUsed(
  tracker: SandwichIngredientTracker,
  ingredientId: string,
): SandwichIngredientTracker {
  const next = new Set(tracker.usedIngredientIds);
  next.add(ingredientId);
  return { usedIngredientIds: next };
}

export function availableIngredientIds(
  tracker: SandwichIngredientTracker,
  allIds: string[],
): string[] {
  return allIds.filter((id) => canPickIngredient(tracker, id));
}
