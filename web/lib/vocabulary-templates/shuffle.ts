/** Deterministic string hash for seeded shuffles (stable across runs). */
function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher–Yates shuffle with a reproducible order for the same seed. */
export function shuffleWithSeed<T>(items: readonly T[], seed: string): T[] {
  const out = [...items];
  const rand = mulberry32(hashSeed(seed));
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** First `n` items after a seeded shuffle (or all items when `n` >= length). */
export function pickNWithSeed<T>(items: readonly T[], n: number, seed: string): T[] {
  if (n <= 0) return [];
  if (n >= items.length) return shuffleWithSeed(items, seed);
  return shuffleWithSeed(items, seed).slice(0, n);
}

/** Unit interval [0, 1) for deterministic true/false mixes and picks. */
export function randomWithSeed(seed: string): number {
  return mulberry32(hashSeed(seed))();
}
