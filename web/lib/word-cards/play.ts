/**
 * Definition race helpers (WC-5) — pure, unit-testable.
 */

import {
  deckReadyForPlay,
  DEFAULT_WORD_CARDS_SETTINGS,
  isInClassDeck,
  type WordCardsModeration,
} from "@/lib/word-cards/domain";

export type WordCardsPlayMode = "definition_race";
export type WordCardsPlayStatus = "selecting" | "locked" | "revealed";

export type WordCardsPlayAnswer = {
  selectedWord: string | null;
  updatedAt: number;
};

export type WordCardsPlayState = {
  mode: WordCardsPlayMode;
  status: WordCardsPlayStatus;
  itemIndex: number;
  promptCardId: string;
  definition: string;
  correctWord: string;
  /** Canonical set — same for every student; display order is client-shuffled. */
  choiceWords: string[];
  answersByStudentId: Record<string, WordCardsPlayAnswer>;
  anonymous: boolean;
  usedCardIds: string[];
  startedAt: number;
  lockedAt: number | null;
  revealedAt: number | null;
};

export type ApprovedDeckCard = {
  id: string;
  assignedWord: string;
  definition: string;
  moderation: WordCardsModeration | string;
};

export function listApprovedPlayableCards(cards: ApprovedDeckCard[]): ApprovedDeckCard[] {
  return cards.filter(
    (c) =>
      isInClassDeck(c.moderation) &&
      c.assignedWord.trim().length > 0 &&
      c.definition.trim().length > 0,
  );
}

export function canStartDefinitionRace(
  approvedPlayableCount: number,
  minDeckSize: number = DEFAULT_WORD_CARDS_SETTINGS.minDeckSizeForPlay,
): boolean {
  return deckReadyForPlay(approvedPlayableCount, minDeckSize);
}

/** Unique deck words with correct word always included. */
export function buildDefinitionRaceChoiceWords(
  approvedCards: ApprovedDeckCard[],
  correctWord: string,
): string[] {
  const correct = correctWord.trim();
  const seen = new Set<string>();
  const out: string[] = [];
  for (const card of approvedCards) {
    const w = card.assignedWord.trim();
    if (!w) continue;
    const key = w.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(w);
  }
  if (correct && !seen.has(correct.toLowerCase())) {
    out.unshift(correct);
  }
  return out;
}

/** Mulberry32 + string seed — deterministic private shuffle per student/item. */
export function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function seededShuffle<T>(items: readonly T[], seed: string): T[] {
  const arr = [...items];
  let state = hashSeed(seed) || 1;
  const next = () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
  return arr;
}

export function playChoiceDisplayOrder(input: {
  choiceWords: string[];
  userId: string;
  promptCardId: string;
  itemIndex: number;
}): string[] {
  return seededShuffle(
    input.choiceWords,
    `${input.userId}:${input.promptCardId}:${input.itemIndex}`,
  );
}

export function pickNextPromptCard(
  approvedPlayable: ApprovedDeckCard[],
  usedCardIds: string[],
): ApprovedDeckCard | null {
  if (approvedPlayable.length === 0) return null;
  const unused = approvedPlayable.filter((c) => !usedCardIds.includes(c.id));
  if (unused.length > 0) return unused[0]!;
  // Cycle through the deck after all cards have been used once.
  const lastUsed = usedCardIds[usedCardIds.length - 1];
  const lastIdx = approvedPlayable.findIndex((c) => c.id === lastUsed);
  const nextIdx = lastIdx >= 0 ? (lastIdx + 1) % approvedPlayable.length : 0;
  return approvedPlayable[nextIdx]!;
}

export function buildPlayItem(input: {
  card: ApprovedDeckCard;
  approvedPlayable: ApprovedDeckCard[];
  itemIndex: number;
  usedCardIds: string[];
  now?: number;
}): WordCardsPlayState {
  const now = input.now ?? Date.now();
  const correctWord = input.card.assignedWord.trim();
  const choiceWords = buildDefinitionRaceChoiceWords(input.approvedPlayable, correctWord);
  if (!choiceWords.includes(correctWord) && correctWord) {
    choiceWords.unshift(correctWord);
  }
  const used = input.usedCardIds.includes(input.card.id)
    ? [...input.usedCardIds]
    : [...input.usedCardIds, input.card.id];

  return {
    mode: "definition_race",
    status: "selecting",
    itemIndex: input.itemIndex,
    promptCardId: input.card.id,
    definition: input.card.definition.trim(),
    correctWord,
    choiceWords,
    answersByStudentId: {},
    anonymous: true,
    usedCardIds: used,
    startedAt: now,
    lockedAt: null,
    revealedAt: null,
  };
}

export function isAnswerCorrect(selectedWord: string | null | undefined, correctWord: string): boolean {
  if (!selectedWord) return false;
  return selectedWord.trim().toLowerCase() === correctWord.trim().toLowerCase();
}

export function aggregatePlayResults(play: WordCardsPlayState): {
  answered: number;
  correct: number;
  incorrect: number;
  blank: number;
  countsByWord: Record<string, number>;
} {
  const countsByWord: Record<string, number> = {};
  let answered = 0;
  let correct = 0;
  let incorrect = 0;
  let blank = 0;
  for (const ans of Object.values(play.answersByStudentId)) {
    const w = ans.selectedWord?.trim() ?? "";
    if (!w) {
      blank += 1;
      continue;
    }
    answered += 1;
    countsByWord[w] = (countsByWord[w] ?? 0) + 1;
    if (isAnswerCorrect(w, play.correctWord)) correct += 1;
    else incorrect += 1;
  }
  return { answered, correct, incorrect, blank, countsByWord };
}
