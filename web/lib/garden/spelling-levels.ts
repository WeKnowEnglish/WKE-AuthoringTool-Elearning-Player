import { KID_SCRABBLE_WORDS } from "@/lib/scrabble/scrabble-words";

/** Garden-only words (e.g. Q) — still kid-appropriate ESL vocabulary. */
export const GARDEN_SPELLING_EXTRA_WORDS = [
  "QUIZ",
  // Level 5 — five-letter practice words
  "APPLE",
  "BREAD",
  "CHAIR",
  "CLASS",
  "DANCE",
  "EARTH",
  "FRUIT",
  "GRASS",
  "HAPPY",
  "HOUSE",
  "JUICE",
  "LIGHT",
  "MUSIC",
  "NIGHT",
  "OCEAN",
  "PLANT",
  "QUEEN",
  "RIVER",
  "SCHOOL",
  "SMILE",
  "STORY",
  "TABLE",
  "TIGER",
  "WATER",
  "WOMAN",
  "YELLOW",
  "ZEBRA",
  // Level 6 — five- and six-letter practice words
  "ANIMAL",
  "BANANA",
  "BRIDGE",
  "BUTTER",
  "CAMEL",
  "CHERRY",
  "COFFEE",
  "COUSIN",
  "DANCER",
  "EAGLE",
  "ELEVEN",
  "EXTRA",
  "FAMILY",
  "FATHER",
  "FIXED",
  "FRIEND",
  "GARDEN",
  "GENTLE",
  "HORSE",
  "JACKET",
  "JUNGLE",
  "KITTEN",
  "LEMON",
  "LETTER",
  "MIRROR",
  "MONKEY",
  "MOTHER",
  "NATURE",
  "NUMBER",
  "ORANGE",
  "PARROT",
  "PENCIL",
  "PEOPLE",
  "PIANO",
  "PLANET",
  "POTATO",
  "PURPLE",
  "RABBIT",
  "SISTER",
  "SPRING",
  "SQUARE",
  "SUMMER",
  "SUNSET",
  "TEMPLE",
  "TICKET",
  "TURTLE",
  "VIOLIN",
  "WINTER",
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
 * Six garden spelling levels. Each list uses every letter A–Z across its words.
 * Words progress from short (2–3 letters) to longer (5–6 letters).
 */
export const GARDEN_SPELLING_LEVELS: readonly GardenSpellingLevel[] = [
  {
    id: 1,
    title: "Sprout",
    subtitle: "2–4 letter words",
    minWordLength: 2,
    maxWordLength: 4,
    words: [
      "AM", "AT", "BE", "BY", "CAT", "COW", "DOG", "EGG", "FOX", "GUM", "HAT", "HEN",
      "JAM", "KID", "LIP", "MAN", "NUT", "OAK", "PEN", "QUIZ", "RAT", "RUN", "SIX",
      "SUN", "TUB", "VAN", "WEB", "YES", "YOU", "ZOO",
    ],
  },
  {
    id: 2,
    title: "Bud",
    subtitle: "3–4 letter words",
    minWordLength: 3,
    maxWordLength: 4,
    words: [
      "ANT", "BAT", "BEE", "BUS", "CAN", "COW", "CUP", "DAY", "DIG", "EGG", "FAT",
      "FOX", "GUM", "HAT", "HEN", "ICE", "JAM", "JET", "KEY", "KID", "KIT", "LEG",
      "LIP", "LOG", "MAN", "MAP", "MIX", "MUD", "NUT", "OAK", "OWL", "PEN", "PIG",
      "POT", "QUIZ", "RAT", "RUN", "SIX", "SUN", "TAB", "TEN", "TIP", "TOP", "TUB",
      "TWO", "VAN", "WAR", "WEB", "WET", "YES", "YOU", "ZOO",
    ],
  },
  {
    id: 3,
    title: "Leaf",
    subtitle: "3–4 letter words",
    minWordLength: 3,
    maxWordLength: 4,
    words: [
      "AND", "BOOK", "DARK", "DUCK", "FISH", "FIVE", "FROG", "GAME", "GIRL", "HAND",
      "HEAD", "HELP", "HIDE", "HILL", "HOME", "HOPE", "JUMP", "JUST", "KEEP", "KIND",
      "KITE", "KNOW", "LAMP", "LAKE", "LEAF", "LIKE", "LION", "LOOK", "LOVE", "MOON",
      "MORE", "NAME", "NEST", "NICE", "NOSE", "OPEN", "PARK", "PLAY", "POND", "QUIZ",
      "RAIN", "READ", "RING", "ROAD", "ROCK", "ROSE", "SAND", "SIX", "SNOW", "SOON",
      "STAR", "STOP", "SWIM", "TAIL", "TALK", "TREE", "TRIP", "TRUE", "TURN", "VAST",
      "WALK", "WARM", "WASH", "WAVE", "WILD", "WIND", "WISH", "WOOD", "WORD", "YARD",
      "ZERO", "ZONE",
    ],
  },
  {
    id: 4,
    title: "Bloom",
    subtitle: "4 letter words",
    minWordLength: 4,
    maxWordLength: 4,
    words: [
      "BOOK", "COOK", "COOL", "DARK", "DUCK", "FISH", "FIVE", "FROG", "GAME", "GIRL",
      "GOOD", "HAND", "HEAD", "HELP", "HIDE", "HILL", "HOME", "HOPE", "HORN", "HURT",
      "IDEA", "JUMP", "JUST", "KEEP", "KIND", "KITE", "KNOW", "LAMP", "LAKE", "LEAF",
      "LIKE", "LION", "LOOK", "LOVE", "MADE", "MOON", "MORE", "NAME", "NEST", "NICE",
      "NOSE", "OPEN", "PARK", "PLAY", "POND", "PUSH", "QUIZ", "RAIN", "READ", "RING",
      "ROAD", "ROCK", "ROSE", "SAND", "SHIP", "SHOW", "SING", "SNOW", "SOON",
      "STAR", "STOP", "SWIM", "TAIL", "TALK", "TEXT", "TREE", "TRIP", "TRUE", "TURN", "VAST",
      "WALK", "WARM", "WASH", "WAVE", "WILD", "WIND", "WISH", "WOOD", "WORD", "WORK",
      "YARD", "ZERO", "ZONE",
    ],
  },
  {
    id: 5,
    title: "Harvest",
    subtitle: "4–5 letter words",
    minWordLength: 4,
    maxWordLength: 5,
    words: [
      "BOOK", "DARK", "DUCK", "FISH", "FIVE", "FROG", "GAME", "HAND", "HELP", "HURT",
      "JUMP", "KNOW", "LOVE", "MANY", "MOON", "OPEN", "PLAY", "PUSH", "QUIZ", "RAIN",
      "READ", "RING", "ROAD", "ROCK", "ROSE", "SAND", "SNOW", "STAR", "SWIM",
      "TALK", "TEXT", "TREE", "TRUE", "WALK", "WARM", "WASH", "WILD", "WISH", "WORD", "WORK",
      "YARD", "ZERO", "APPLE", "BREAD", "CHAIR", "CLASS", "DANCE", "EARTH", "FRUIT",
      "GRASS", "HAPPY", "HOUSE", "JUICE", "LIGHT", "MUSIC", "NIGHT", "OCEAN", "PLANT",
      "QUEEN", "RIVER", "SMILE", "STORY", "TABLE", "TIGER", "WATER", "WOMAN",
      "ZEBRA",
    ],
  },
  {
    id: 6,
    title: "Master",
    subtitle: "5–6 letter words",
    minWordLength: 5,
    maxWordLength: 6,
    words: [
      "APPLE", "BANANA", "BRIDGE", "BUTTER", "CAMEL", "CHERRY", "COFFEE", "COUSIN",
      "DANCER", "EAGLE", "ELEVEN", "EXTRA", "FAMILY", "FATHER", "FIXED", "FRIEND",
      "GARDEN", "GENTLE", "HORSE", "JACKET", "JUNGLE", "KITTEN", "LEMON", "LETTER",
      "MIRROR", "MONKEY", "MOTHER", "NATURE", "NUMBER", "ORANGE", "PARROT", "PENCIL",
      "PEOPLE", "PIANO", "PLANET", "POTATO", "PURPLE", "QUEEN", "RABBIT", "SCHOOL",
      "SISTER", "SPRING", "SQUARE", "SUMMER", "SUNSET", "TEMPLE", "TICKET", "TIGER",
      "TURTLE", "VIOLIN", "WINTER", "WIZARD", "YELLOW", "ZEBRA",
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
