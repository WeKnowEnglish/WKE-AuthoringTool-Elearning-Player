import {
  ALPHABET_LETTERS,
  getGardenSpellingLevel,
  nextSpellingLevel,
} from "@/lib/garden/spelling-levels";
import { letterCounts } from "@/lib/garden/spelling";
import type { GardenSnapshotV1, LetterInventory } from "@/lib/garden/types";

/** Weight per unit of letter deficit (letters still needed to spell unspelled words). */
export const HARVEST_NEED_MULTIPLIER = 3;

/** Weight for on-level letters the student already has enough of. */
export const HARVEST_LEVEL_LETTER_WEIGHT = 1;

/** Floor weight for letters not used by any unspelled word at the target level. */
export const HARVEST_OFF_LEVEL_FLOOR = 0.15;

export function unspelledWordsAtLevel(snapshot: GardenSnapshotV1): string[] {
  const level = getGardenSpellingLevel(snapshot.spellingLevel);
  const spelled = new Set(snapshot.spelledAtLevel.map((w) => w.toUpperCase()));
  return level.words.filter((w) => !spelled.has(w));
}

/** Words used to compute harvest weights (current level, or next level if complete). */
export function targetWordsForHarvest(snapshot: GardenSnapshotV1): string[] {
  const unspelled = unspelledWordsAtLevel(snapshot);
  if (unspelled.length > 0) return [...unspelled];

  const nextLevel = nextSpellingLevel(snapshot.spellingLevel);
  if (nextLevel) {
    return [...getGardenSpellingLevel(nextLevel).words];
  }
  return [];
}

export function letterDemandForWords(words: readonly string[]): Record<string, number> {
  const demand: Record<string, number> = {};
  for (const word of words) {
    for (const [ch, count] of Object.entries(letterCounts(word))) {
      demand[ch] = (demand[ch] ?? 0) + count;
    }
  }
  return demand;
}

export function letterDeficits(
  demand: Record<string, number>,
  inventory: LetterInventory,
): Record<string, number> {
  const deficits: Record<string, number> = {};
  for (const [ch, needed] of Object.entries(demand)) {
    const deficit = Math.max(0, needed - (inventory[ch] ?? 0));
    if (deficit > 0) deficits[ch] = deficit;
  }
  return deficits;
}

export function lettersUsedByWords(words: readonly string[]): Set<string> {
  const letters = new Set<string>();
  for (const word of words) {
    for (const ch of word.toUpperCase()) {
      if (ch >= "A" && ch <= "Z") letters.add(ch);
    }
  }
  return letters;
}

export function buildHarvestWeights(snapshot: GardenSnapshotV1): Record<string, number> {
  const targetWords = targetWordsForHarvest(snapshot);
  if (targetWords.length === 0) {
    return Object.fromEntries(ALPHABET_LETTERS.map((ch) => [ch, 1]));
  }

  const demand = letterDemandForWords(targetWords);
  const deficits = letterDeficits(demand, snapshot.letters);
  const levelLetters = lettersUsedByWords(targetWords);

  const weights: Record<string, number> = {};
  for (const ch of ALPHABET_LETTERS) {
    const deficit = deficits[ch] ?? 0;
    if (deficit > 0) {
      weights[ch] = deficit * HARVEST_NEED_MULTIPLIER;
    } else if (levelLetters.has(ch)) {
      weights[ch] = HARVEST_LEVEL_LETTER_WEIGHT;
    } else {
      weights[ch] = HARVEST_OFF_LEVEL_FLOOR;
    }
  }
  return weights;
}

export function pickWeightedLetter(
  weights: Record<string, number>,
  random: () => number = Math.random,
): string {
  let total = 0;
  for (const ch of ALPHABET_LETTERS) {
    total += weights[ch] ?? 0;
  }
  if (total <= 0) return "A";

  let roll = random() * total;
  for (const ch of ALPHABET_LETTERS) {
    roll -= weights[ch] ?? 0;
    if (roll <= 0) return ch;
  }
  return ALPHABET_LETTERS[ALPHABET_LETTERS.length - 1] ?? "A";
}

export function rollWeightedHarvestLetter(
  snapshot: GardenSnapshotV1,
  random: () => number = Math.random,
): string {
  return pickWeightedLetter(buildHarvestWeights(snapshot), random);
}
