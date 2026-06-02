export type MemoryPairEntry = {
  pairId: string;
  word: string;
  emoji: string;
  /** Optional future real image URL. */
  imageUrl?: string;
};

export type MemoryDeckId = "pets" | "food_snacks";

export type MemoryDeck = {
  id: MemoryDeckId;
  label: string;
  pairs: MemoryPairEntry[];
};

export const MEMORY_DECKS: MemoryDeck[] = [
  {
    id: "pets",
    label: "Pets",
    pairs: [
      { pairId: "cat", word: "CAT", emoji: "🐱" },
      { pairId: "dog", word: "DOG", emoji: "🐶" },
      { pairId: "fish", word: "FISH", emoji: "🐟" },
      { pairId: "bird", word: "BIRD", emoji: "🐦" },
      { pairId: "hamster", word: "HAMSTER", emoji: "🐹" },
      { pairId: "rabbit", word: "RABBIT", emoji: "🐰" },
    ],
  },
  {
    id: "food_snacks",
    label: "Snacks",
    pairs: [
      { pairId: "apple", word: "APPLE", emoji: "🍎" },
      { pairId: "cookie", word: "COOKIE", emoji: "🍪" },
      { pairId: "milk", word: "MILK", emoji: "🥛" },
      { pairId: "cake", word: "CAKE", emoji: "🍰" },
      { pairId: "bread", word: "BREAD", emoji: "🍞" },
      { pairId: "egg", word: "EGG", emoji: "🥚" },
    ],
  },
];

export const PAIRS_PER_RUN = 4;

export function pickDeck(random: () => number = Math.random): MemoryDeck {
  const index = Math.floor(random() * MEMORY_DECKS.length);
  return MEMORY_DECKS[index] ?? MEMORY_DECKS[0]!;
}

export function pickPairsForRun(
  deck: MemoryDeck,
  count: number = PAIRS_PER_RUN,
  random: () => number = Math.random,
): MemoryPairEntry[] {
  const pool = [...deck.pairs];
  const picked: MemoryPairEntry[] = [];
  const n = Math.min(count, pool.length);
  for (let i = 0; i < n; i++) {
    const idx = Math.floor(random() * pool.length);
    picked.push(pool.splice(idx, 1)[0]!);
  }
  return picked;
}
