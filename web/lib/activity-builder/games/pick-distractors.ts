/** Distractor helpers for MCQ compile from vocabulary lists. */

export const MC_QUIZ_PAD_DISTRACTORS = [
  "book",
  "water",
  "school",
  "friend",
  "apple",
  "house",
  "music",
  "happy",
] as const;

function shuffleInPlace<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = items[i]!;
    items[i] = items[j]!;
    items[j] = tmp;
  }
  return items;
}

/** Pick up to `count` distractors from other list words, then pad pool. */
export function pickDistractors(
  target: string,
  vocabulary: string[],
  count: number,
  options?: { stable?: boolean },
): string[] {
  const targetKey = target.toLowerCase();
  const fromList = vocabulary.filter((word) => word.toLowerCase() !== targetKey);
  if (options?.stable) {
    fromList.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  } else {
    shuffleInPlace(fromList);
  }

  const picked: string[] = [];
  const used = new Set<string>([targetKey]);

  for (const word of fromList) {
    if (picked.length >= count) break;
    const key = word.toLowerCase();
    if (used.has(key)) continue;
    used.add(key);
    picked.push(word);
  }

  const pad = [...MC_QUIZ_PAD_DISTRACTORS];
  if (!options?.stable) {
    shuffleInPlace(pad);
  }
  for (const word of pad) {
    if (picked.length >= count) break;
    const key = word.toLowerCase();
    if (used.has(key)) continue;
    used.add(key);
    picked.push(word);
  }

  return picked.slice(0, count);
}
