import { KID_SCRABBLE_WORDS } from "@/lib/scrabble/scrabble-words";

/** Garden-only words (e.g. Q) — still kid-appropriate ESL vocabulary. */
export const GARDEN_SPELLING_EXTRA_WORDS = [
  "QUIZ",
  // Level 5
  "BREAD",
  "CHAIR",
  "FRUIT",
  "LIGHT",
  "JUICE",
  "MUSIC",
  "OCEAN",
  "HAPPY",
  "RIVER",
  "WOMAN",
  // Level 6
  "DANCER",
  "BRIDGE",
  "FAMILY",
  "FATHER",
  "JACKET",
  "COUSIN",
  "PENCIL",
  "SQUARE",
  "VIOLIN",
  "WINTER",
  "EXTRA",
  "WIZARD",
] as const;

export const GARDEN_SPELLING_VOCAB = new Set<string>([
  ...KID_SCRABBLE_WORDS,
  ...GARDEN_SPELLING_EXTRA_WORDS,
]);

export const GARDEN_SPELLING_LEVEL_IDS = [1, 2, 3, 4, 5, 6] as const;

export type GardenSpellingLevelId = (typeof GARDEN_SPELLING_LEVEL_IDS)[number];

export type GardenSpellingLevel = {
  id: GardenSpellingLevelId;
  title: string;
  subtitle: string;
  minWordLength: number;
  maxWordLength: number;
  /** Every A–Z letter appears in at least one word in this list. */
  words: readonly string[];
};

/**
 * Six garden spelling levels — 12 words each. Each list still uses every letter A–Z
 * across its words. Later levels reuse few words from earlier lists (QUIZ carries Q).
 */
export const GARDEN_SPELLING_LEVELS: readonly GardenSpellingLevel[] = [
  {
    id: 1,
    title: "Sprout",
    subtitle: "2–4 letter words",
    minWordLength: 2,
    maxWordLength: 4,
    words: [
      "QUIZ", "JUMP", "WEB", "FOX", "COW", "KID", "HEN", "VAT", "GAS", "RAT", "BOY", "LIP",
    ],
  },
  {
    id: 2,
    title: "Bud",
    subtitle: "3–4 letter words",
    minWordLength: 3,
    maxWordLength: 4,
    words: [
      "BAT", "NUT", "CUP", "DUCK", "FISH", "GIRL", "HOME", "JUST", "YARD", "WAX", "VAST", "QUIZ",
    ],
  },
  {
    id: 3,
    title: "Leaf",
    subtitle: "3–4 letter words",
    minWordLength: 3,
    maxWordLength: 4,
    words: [
      "BEE", "COOK", "DARK", "FIVE", "FROG", "HOPE", "JET", "LION", "SWIM", "TEXT", "YET", "QUIZ",
    ],
  },
  {
    id: 4,
    title: "Bloom",
    subtitle: "4 letter words",
    minWordLength: 4,
    maxWordLength: 4,
    words: [
      "BOOK", "COOL", "FOUR", "GAME", "HAND", "JUST", "PUSH", "WARM", "VICE", "YARD", "TEXT", "QUIZ",
    ],
  },
  {
    id: 5,
    title: "Harvest",
    subtitle: "4–5 letter words",
    minWordLength: 4,
    maxWordLength: 5,
    words: [
      "BREAD", "CHAIR", "FRUIT", "LIGHT", "JUICE", "LAKE", "MUSIC", "WOMAN", "HAPPY", "QUIZ", "RIVER", "TEXT",
    ],
  },
  {
    id: 6,
    title: "Master",
    subtitle: "5–6 letter words",
    minWordLength: 5,
    maxWordLength: 6,
    words: [
      "DANCER", "BRIDGE", "FAMILY", "FATHER", "JACKET", "COUSIN", "PENCIL", "SQUARE", "VIOLIN", "WINTER", "EXTRA", "WIZARD",
    ],
  },
] as const;

const LEVEL_BY_ID = new Map(GARDEN_SPELLING_LEVELS.map((l) => [l.id, l]));

const WORD_TO_LEVELS = new Map<string, GardenSpellingLevelId[]>();
for (const level of GARDEN_SPELLING_LEVELS) {
  for (const word of level.words) {
    const normalized = word.toUpperCase();
    const existing = WORD_TO_LEVELS.get(normalized) ?? [];
    if (!existing.includes(level.id)) existing.push(level.id);
    WORD_TO_LEVELS.set(normalized, existing);
  }
}

export const ALPHABET_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export function getGardenSpellingLevel(id: GardenSpellingLevelId): GardenSpellingLevel {
  const level = LEVEL_BY_ID.get(id);
  if (!level) throw new Error(`Unknown spelling level: ${id}`);
  return level;
}

export function clampSpellingLevel(level: unknown): GardenSpellingLevelId {
  const n = typeof level === "number" ? Math.floor(level) : 1;
  if (n < 1) return 1;
  if (n > 6) return 6;
  return n as GardenSpellingLevelId;
}

export function isWordInSpellingLevel(
  levelId: GardenSpellingLevelId,
  word: string,
): boolean {
  const normalized = word.trim().toUpperCase();
  const level = getGardenSpellingLevel(levelId);
  return level.words.includes(normalized);
}

export function isGardenSpellingWord(word: string): boolean {
  const normalized = word.trim().toUpperCase();
  return normalized.length >= 2 && GARDEN_SPELLING_VOCAB.has(normalized);
}

/** Kid Scrabble word that fits the student's current spelling level length band. */
export function isGardenSpellingWordForLevel(
  word: string,
  levelId: GardenSpellingLevelId,
  minLength = 3,
): boolean {
  const normalized = word.trim().toUpperCase();
  if (!/^[A-Z]+$/.test(normalized)) return false;
  const level = getGardenSpellingLevel(levelId);
  if (normalized.length < minLength || normalized.length > level.maxWordLength) return false;
  return GARDEN_SPELLING_VOCAB.has(normalized);
}

export function missingAlphabetLetters(words: readonly string[]): string[] {
  const seen = new Set<string>();
  for (const word of words) {
    for (const ch of word.toUpperCase()) {
      if (ch >= "A" && ch <= "Z") seen.add(ch);
    }
  }
  return ALPHABET_LETTERS.filter((ch) => !seen.has(ch));
}

export function spellingLevelProgress(
  levelId: GardenSpellingLevelId,
  spelledAtLevel: readonly string[],
): { spelled: number; total: number; isComplete: boolean } {
  const level = getGardenSpellingLevel(levelId);
  const normalized = new Set(spelledAtLevel.map((w) => w.toUpperCase()));
  const spelled = level.words.filter((w) => normalized.has(w)).length;
  return {
    spelled,
    total: level.words.length,
    isComplete: spelled >= level.words.length,
  };
}

export function nextSpellingLevel(
  levelId: GardenSpellingLevelId,
): GardenSpellingLevelId | null {
  if (levelId >= 6) return null;
  return (levelId + 1) as GardenSpellingLevelId;
}
