import { buildCardsFromPairs, type MemoryCard } from "@/lib/memory/memory-cards";
import { pickPetFlipIndices } from "@/lib/memory/memory-pet-turn";
import {
  PAIRS_PER_RUN,
  pickDeck,
  pickPairsForRun,
  type MemoryDeckId,
  type MemoryPairEntry,
} from "@/lib/memory/memory-pairs";

import type { MemoryPlayOutcome } from "@/lib/pet/care-actions";

export type { MemoryPlayOutcome };

export type ActiveSide = "player" | "pet";

export type CardState = "down" | "up" | "matched";

export type PetMemoryEntry = {
  index: number;
  pairId: string;
  face: "word" | "picture";
};

export type MemorySession = {
  sessionId: string;
  deckId: MemoryDeckId;
  firstPlayer: ActiveSide;
  activeSide: ActiveSide;
  cards: MemoryCard[];
  states: CardState[];
  playerMatches: number;
  petMatches: number;
  pairsRemaining: number;
  /** 0 = waiting for first flip, 1 = waiting for second flip in current turn. */
  flipStep: 0 | 1;
  pendingFirstIndex: number | null;
  petMemory: PetMemoryEntry[];
};

export type FlipResult =
  | { ok: true; session: MemorySession; needsResolve: boolean }
  | { ok: false; reason: string };

export type TurnResolveResult = {
  session: MemorySession;
  matched: boolean;
  /** Same side plays again after a match. */
  keepTurn: boolean;
  completed: boolean;
};

let sessionCounter = 0;

function nextSessionId(): string {
  sessionCounter += 1;
  return `memory-${Date.now()}-${sessionCounter}`;
}

function initialStates(count: number): CardState[] {
  return Array.from({ length: count }, (): CardState => "down");
}

export function createMemorySession(
  random: () => number = Math.random,
): MemorySession {
  const deck = pickDeck(random);
  const pairs = pickPairsForRun(deck, PAIRS_PER_RUN, random);
  const cards = buildCardsFromPairs(pairs, random);
  const firstPlayer: ActiveSide = random() < 0.5 ? "player" : "pet";

  return {
    sessionId: nextSessionId(),
    deckId: deck.id,
    firstPlayer,
    activeSide: firstPlayer,
    cards,
    states: initialStates(cards.length),
    playerMatches: 0,
    petMatches: 0,
    pairsRemaining: pairs.length,
    flipStep: 0,
    pendingFirstIndex: null,
    petMemory: [],
  };
}

export function isSessionComplete(session: MemorySession): boolean {
  return session.pairsRemaining <= 0;
}

export function canFlipCard(session: MemorySession, index: number): boolean {
  if (isSessionComplete(session)) return false;
  if (index < 0 || index >= session.states.length) return false;
  return session.states[index] === "down";
}

function rememberCard(session: MemorySession, index: number): PetMemoryEntry[] {
  const card = session.cards[index]!;
  const exists = session.petMemory.some((m) => m.index === index);
  if (exists) return session.petMemory;
  return [
    ...session.petMemory,
    { index, pairId: card.pairId, face: card.face },
  ];
}

/** Flip one card face-up (player or pet). Second flip of turn may need resolve. */
export function flipCard(session: MemorySession, index: number): FlipResult {
  if (!canFlipCard(session, index)) {
    return { ok: false, reason: "That card cannot be flipped." };
  }

  const states = [...session.states];
  states[index] = "up";
  let next: MemorySession = {
    ...session,
    states,
    petMemory: rememberCard(session, index),
  };

  if (next.flipStep === 0) {
    next = {
      ...next,
      flipStep: 1,
      pendingFirstIndex: index,
    };
    return { ok: true, session: next, needsResolve: false };
  }

  return { ok: true, session: next, needsResolve: true };
}

function cardsMatch(session: MemorySession, a: number, b: number): boolean {
  const cardA = session.cards[a]!;
  const cardB = session.cards[b]!;
  return (
    cardA.pairId === cardB.pairId &&
    cardA.face !== cardB.face &&
    (cardA.face === "word" || cardA.face === "picture") &&
    (cardB.face === "word" || cardB.face === "picture")
  );
}

function secondUpIndex(session: MemorySession, first: number): number | null {
  for (let i = 0; i < session.states.length; i++) {
    if (i !== first && session.states[i] === "up") return i;
  }
  return null;
}

/** Call after the second flip of a turn (states already "up" on both). */
export function resolveTurn(session: MemorySession): TurnResolveResult {
  const first = session.pendingFirstIndex;
  if (first == null) {
    return {
      session: { ...session, flipStep: 0, pendingFirstIndex: null },
      matched: false,
      keepTurn: false,
      completed: isSessionComplete(session),
    };
  }

  const idxB = secondUpIndex(session, first);

  if (idxB == null) {
    return {
      session: { ...session, flipStep: 0, pendingFirstIndex: null },
      matched: false,
      keepTurn: false,
      completed: isSessionComplete(session),
    };
  }

  const matched = cardsMatch(session, first, idxB);
  const scorer = session.activeSide;

  if (matched) {
    const states = [...session.states];
    states[first] = "matched";
    states[idxB] = "matched";
    const pairsRemaining = session.pairsRemaining - 1;
    const completed = pairsRemaining <= 0;

    const next: MemorySession = {
      ...session,
      states,
      pairsRemaining,
      playerMatches:
        scorer === "player" ? session.playerMatches + 1 : session.playerMatches,
      petMatches: scorer === "pet" ? session.petMatches + 1 : session.petMatches,
      flipStep: 0,
      pendingFirstIndex: null,
      activeSide: session.activeSide,
    };

    return {
      session: next,
      matched: true,
      keepTurn: true,
      completed,
    };
  }

  const states = [...session.states];
  states[first] = "down";
  states[idxB] = "down";
  const nextSide: ActiveSide = session.activeSide === "player" ? "pet" : "player";

  const next: MemorySession = {
    ...session,
    states,
    flipStep: 0,
    pendingFirstIndex: null,
    activeSide: nextSide,
  };

  return {
    session: next,
    matched: false,
    keepTurn: false,
    completed: isSessionComplete(next),
  };
}

/** Apply a miss after UI delay (flip two cards back down). */
export function applyMissFlipDown(session: MemorySession): MemorySession {
  const first = session.pendingFirstIndex;
  if (first == null) return session;

  let idxB: number | null = null;
  for (let i = 0; i < session.states.length; i++) {
    if (i !== first && session.states[i] === "up") {
      idxB = i;
      break;
    }
  }
  if (idxB == null) return resolveTurn(session).session;

  const states = [...session.states];
  states[first] = "down";
  states[idxB] = "down";
  const nextSide: ActiveSide = session.activeSide === "player" ? "pet" : "player";

  return {
    ...session,
    states,
    flipStep: 0,
    pendingFirstIndex: null,
    activeSide: nextSide,
  };
}

/** Run both pet flips and resolve in one step (for tests / simple pet scheduler). */
export function runPetTurn(
  session: MemorySession,
  random: () => number = Math.random,
): { session: MemorySession; completed: boolean } {
  if (session.activeSide !== "pet" || isSessionComplete(session)) {
    return { session, completed: isSessionComplete(session) };
  }

  let current = session;
  const indices = pickPetFlipIndices(current, random);
  if (!indices) {
    return { session: current, completed: isSessionComplete(current) };
  }

  const [a, b] = indices;
  const r1 = flipCard(current, a);
  if (!r1.ok) return { session: current, completed: false };
  current = r1.session;

  const r2 = flipCard(current, b);
  if (!r2.ok) return { session: current, completed: false };
  current = r2.session;

  const resolved = resolveTurn(current);
  let next = resolved.session;

  if (resolved.matched && resolved.keepTurn && !resolved.completed) {
    const again = runPetTurn(next, random);
    return again;
  }

  return { session: next, completed: resolved.completed };
}

export function computeMemoryGoldBonus(playerMatches: number): number {
  return 3 + Math.min(12, playerMatches * 2);
}

export type { MemoryPairEntry };
