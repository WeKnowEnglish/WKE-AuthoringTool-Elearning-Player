import type {
  LiveGameQuestionBank,
  LiveGameQuestionRow,
} from "@/lib/live-game/question-banks/types";
import { shuffleWithSeed } from "@/lib/vocabulary-templates/shuffle";

export function liveGameQuestionDeckCursorKey(
  playerId: string,
  bank: LiveGameQuestionBank,
): string {
  return `${playerId}:${bank}`;
}

function shuffledCycle<T extends { id: string }>(
  rows: readonly T[],
  seed: string,
  cycle: number,
): T[] {
  const deck = shuffleWithSeed(rows, `${seed}:cycle:${cycle}`);
  if (cycle === 0 || deck.length < 2) return deck;

  const previousDeck = shuffleWithSeed(rows, `${seed}:cycle:${cycle - 1}`);
  if (deck[0]?.id === previousDeck.at(-1)?.id) {
    [deck[0], deck[1]] = [deck[1]!, deck[0]!];
  }
  return deck;
}

export function pickQuestionFromSessionDeck<T extends LiveGameQuestionRow>(
  rows: readonly T[],
  input: {
    roomId: string;
    playerId: string;
    bank: LiveGameQuestionBank;
    cursor: number;
  },
): T {
  if (rows.length === 0) throw new Error("Cannot pick from an empty question bank");

  const normalizedCursor = Math.max(0, Math.floor(input.cursor));
  const cycle = Math.floor(normalizedCursor / rows.length);
  const index = normalizedCursor % rows.length;
  const seed = `${input.roomId}:${input.playerId}:${input.bank}`;
  return shuffledCycle(rows, seed, cycle)[index]!;
}
