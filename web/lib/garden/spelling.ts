import { isGardenSpellingWord } from "@/lib/garden/spelling-levels";
import type { LetterInventory } from "@/lib/garden/types";

export { isGardenSpellingWord } from "@/lib/garden/spelling-levels";

export function letterCounts(word: string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const ch of word.trim().toUpperCase()) {
    if (ch < "A" || ch > "Z") continue;
    counts[ch] = (counts[ch] ?? 0) + 1;
  }
  return counts;
}

export function totalLetterCount(letters: LetterInventory): number {
  return Object.values(letters).reduce((sum, n) => sum + n, 0);
}

export function letterInventoryKey(letters: LetterInventory): string {
  return Object.entries(letters)
    .filter(([, count]) => count > 0)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([ch, count]) => `${ch}:${count}`)
    .join(",");
}

export function buildLetterRack(
  letters: LetterInventory,
): { id: string; letter: string }[] {
  const rack: { id: string; letter: string }[] = [];
  for (const ch of Object.keys(letters).sort()) {
    const count = letters[ch] ?? 0;
    for (let i = 0; i < count; i++) {
      rack.push({ id: `${ch}:${i}`, letter: ch });
    }
  }
  return rack;
}

export function canAffordWord(letters: LetterInventory, word: string): boolean {
  const needed = letterCounts(word);
  for (const [ch, n] of Object.entries(needed)) {
    if ((letters[ch] ?? 0) < n) return false;
  }
  return true;
}

export function consumeLetters(letters: LetterInventory, word: string): LetterInventory {
  const needed = letterCounts(word);
  const next: LetterInventory = { ...letters };
  for (const [ch, n] of Object.entries(needed)) {
    const remaining = (next[ch] ?? 0) - n;
    if (remaining > 0) next[ch] = remaining;
    else delete next[ch];
  }
  return next;
}

export function isSpellableWord(word: string): boolean {
  return isGardenSpellingWord(word);
}
