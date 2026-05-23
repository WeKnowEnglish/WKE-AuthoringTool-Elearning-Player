import { seededRandom } from "@/lib/curated-sentences/quiz-compiler-builders";

export type ExploreEncounterTier = "good" | "better" | "best";

export type ExploreEncounterTierDef = {
  tier: ExploreEncounterTier;
  label: string;
  weight: number;
  gold: number;
  wordCount: number;
};

export const EXPLORE_ENCOUNTER_TIER_ORDER: ExploreEncounterTier[] = [
  "good",
  "better",
  "best",
];

export const EXPLORE_ENCOUNTER_TIERS: Record<ExploreEncounterTier, ExploreEncounterTierDef> =
  {
    good: { tier: "good", label: "Good", weight: 75, gold: 20, wordCount: 1 },
    better: { tier: "better", label: "Better", weight: 20, gold: 50, wordCount: 2 },
    best: { tier: "best", label: "Best", weight: 5, gold: 100, wordCount: 3 },
  };

export type ExploreEncounterRollResult = {
  tier: ExploreEncounterTier;
  def: ExploreEncounterTierDef;
  gold: number;
  wordIds: string[];
};

function shuffleInPlace<T>(arr: T[], rand: () => number) {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
}

/** Roll good (75%) / better (20%) / best (5%). */
export function rollExploreEncounterTier(seed: string): ExploreEncounterTier {
  const rand = seededRandom(`${seed}:tier`);
  const roll = rand() * 100;
  if (roll < EXPLORE_ENCOUNTER_TIERS.good.weight) return "good";
  if (roll < EXPLORE_ENCOUNTER_TIERS.good.weight + EXPLORE_ENCOUNTER_TIERS.better.weight) {
    return "better";
  }
  return "best";
}

/** Pick word loot ids from pool (shuffled; cycles if count > pool size). */
export function pickExploreWordLoot(
  pool: string[],
  count: number,
  seed: string,
): string[] {
  if (count < 1 || pool.length === 0) return [];
  const rand = seededRandom(`${seed}:words`);
  const shuffled = [...pool];
  shuffleInPlace(shuffled, rand);
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    out.push(shuffled[i % shuffled.length]!);
  }
  return out;
}

export function resolveExploreEncounterRoll(
  seed: string,
  wordPool: string[],
): ExploreEncounterRollResult {
  const tier = rollExploreEncounterTier(seed);
  const def = EXPLORE_ENCOUNTER_TIERS[tier];
  const wordIds = pickExploreWordLoot(wordPool, def.wordCount, seed);
  return { tier, def, gold: def.gold, wordIds };
}
