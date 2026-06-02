export function scoreWord(word: string): number {
  return word.trim().length;
}

export function scorePlacementWord(word: string): number {
  return scoreWord(word);
}
