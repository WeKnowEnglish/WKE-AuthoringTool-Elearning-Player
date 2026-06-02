import type { MemoryPairEntry } from "@/lib/memory/memory-pairs";

export type MemoryCardFace = "word" | "picture";

export type MemoryCard = {
  id: string;
  pairId: string;
  face: MemoryCardFace;
  word: string;
  emoji: string;
  imageUrl?: string;
};

export function buildCardsFromPairs(
  pairs: MemoryPairEntry[],
  random: () => number = Math.random,
): MemoryCard[] {
  const cards: MemoryCard[] = [];
  for (const pair of pairs) {
    cards.push({
      id: `${pair.pairId}-word`,
      pairId: pair.pairId,
      face: "word",
      word: pair.word,
      emoji: pair.emoji,
      imageUrl: pair.imageUrl,
    });
    cards.push({
      id: `${pair.pairId}-picture`,
      pairId: pair.pairId,
      face: "picture",
      word: pair.word,
      emoji: pair.emoji,
      imageUrl: pair.imageUrl,
    });
  }
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [cards[i], cards[j]] = [cards[j]!, cards[i]!];
  }
  return cards;
}
