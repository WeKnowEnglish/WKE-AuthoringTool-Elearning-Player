export const SUPERLATIVE_SCALES = [
  {
    id: "speed",
    words: ["slowest", "slower", "slow", "fast", "faster", "fastest"],
  },
  {
    id: "size",
    words: ["smallest", "smaller", "small", "big", "bigger", "biggest"],
  },
  {
    id: "light",
    words: ["darkest", "darker", "dark", "bright", "brighter", "brightest"],
  },
  {
    id: "weight",
    words: ["lightest", "lighter", "light", "heavy", "heavier", "heaviest"],
  },
  {
    id: "height",
    words: ["shortest", "shorter", "short", "tall", "taller", "tallest"],
  },
  {
    id: "quality",
    words: ["worst", "worse", "bad", "good", "better", "best"],
  },
] as const;

export type SuperlativeScaleId = (typeof SUPERLATIVE_SCALES)[number]["id"];

export type SuperlativeWord = (typeof SUPERLATIVE_SCALES)[number]["words"][number];

export type SuperlativeScale = (typeof SUPERLATIVE_SCALES)[number];

export type ExpectedSequence = readonly [
  string,
  string,
  string,
  string,
  string,
  string,
];

export function getScaleById(id: SuperlativeScaleId): SuperlativeScale | undefined {
  return SUPERLATIVE_SCALES.find((s) => s.id === id);
}

export function pickRandomScale(
  random: () => number = Math.random,
): SuperlativeScale {
  const index = Math.floor(random() * SUPERLATIVE_SCALES.length);
  return SUPERLATIVE_SCALES[index] ?? SUPERLATIVE_SCALES[0]!;
}

/** Fisher–Yates shuffle (returns new array). */
export function shuffleWords(
  words: readonly string[],
  random: () => number = Math.random,
): string[] {
  const out = [...words];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const tmp = out[i]!;
    out[i] = out[j]!;
    out[j] = tmp;
  }
  return out;
}
