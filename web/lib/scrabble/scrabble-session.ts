import {
  applyPlacement,
  createEmptyBoard,
  isBoardEmpty,
  rackLettersNeeded,
  validatePlacementStructure,
  wordsFormedByPlacement,
  type WordPlacement,
} from "@/lib/scrabble/scrabble-board";
import {
  consumeFromRack,
  createShuffledBag,
  rackCanSupply,
  refillRack,
  RACK_SIZE,
} from "@/lib/scrabble/scrabble-letters";
import {
  applyPetPlay,
  petRackLettersUsed,
  pickPetPlay,
} from "@/lib/scrabble/scrabble-pet-plays";
import { scorePlacementWord } from "@/lib/scrabble/scrabble-scoring";
import { allWordsValid } from "@/lib/scrabble/scrabble-words";

export type ScrabblePlayOutcome = "completed" | "gave_up";

export type ActiveSide = "player" | "pet";

export type ScrabbleSession = {
  sessionId: string;
  firstPlayer: ActiveSide;
  activeSide: ActiveSide;
  wordsPlayed: number;
  board: BoardState;
  playerRack: string[];
  petRack: string[];
  playerBag: string[];
  petBag: string[];
  playerScore: number;
  petScore: number;
};

export type PlayerPlayResult =
  | { ok: true; session: ScrabbleSession }
  | { ok: false; reason: string };

let sessionCounter = 0;

function nextSessionId(): string {
  sessionCounter += 1;
  return `scrabble-${Date.now()}-${sessionCounter}`;
}

function initSide(
  random: () => number,
): Pick<ScrabbleSession, "playerBag" | "petBag" | "playerRack" | "petRack"> {
  const playerBag = createShuffledBag(random);
  const petBag = createShuffledBag(random);
  const playerRefill = refillRack([], playerBag, RACK_SIZE);
  const petRefill = refillRack([], petBag, RACK_SIZE);
  return {
    playerBag: playerRefill.bag,
    petRack: petRefill.rack,
    petBag: petRefill.bag,
    playerRack: playerRefill.rack,
  };
}

export function createScrabbleSession(
  random: () => number = Math.random,
): ScrabbleSession {
  const firstPlayer: ActiveSide = random() < 0.5 ? "player" : "pet";
  const bags = initSide(random);
  let session: ScrabbleSession = {
    sessionId: nextSessionId(),
    firstPlayer,
    activeSide: firstPlayer,
    wordsPlayed: 0,
    board: createEmptyBoard(),
    playerScore: 0,
    petScore: 0,
    ...bags,
  };

  if (firstPlayer === "pet") {
    session = runPetTurn(session, random);
  }

  return session;
}

export function isSessionComplete(session: ScrabbleSession): boolean {
  return session.wordsPlayed >= 6;
}

export function tryPlayerPlay(
  session: ScrabbleSession,
  placement: WordPlacement,
): PlayerPlayResult {
  if (session.activeSide !== "player") {
    return { ok: false, reason: "Not your turn." };
  }
  if (isSessionComplete(session)) {
    return { ok: false, reason: "Game is over." };
  }

  const structureError = validatePlacementStructure(session.board, placement);
  if (structureError) {
    const messages: Record<string, string> = {
      out_of_bounds: "That word does not fit on the board.",
      empty_word: "Words need at least 2 letters.",
      no_center: "The first word must cross the center star.",
      not_connected: "Your word must touch another word.",
      conflict: "Letters must match the tiles already on the board.",
      no_new_tiles: "Place at least one new tile from your rack.",
    };
    return { ok: false, reason: messages[structureError] ?? "Invalid placement." };
  }

  const needed = rackLettersNeeded(session.board, placement);
  if (!rackCanSupply(session.playerRack, needed)) {
    return { ok: false, reason: "You do not have those letters on your rack." };
  }

  const formed = wordsFormedByPlacement(session.board, placement);
  if (!allWordsValid(formed)) {
    return { ok: false, reason: "That is not a word we know. Try another!" };
  }

  const wordScore = scorePlacementWord(placement.word);
  const newBoard = applyPlacement(session.board, placement);
  let playerRack = consumeFromRack(session.playerRack, needed);
  const refill = refillRack(playerRack, session.playerBag, RACK_SIZE);
  playerRack = refill.rack;

  const next = advanceAfterPlay({
    ...session,
    board: newBoard,
    playerRack,
    playerBag: refill.bag,
    playerScore: session.playerScore + wordScore,
  });

  return { ok: true, session: next };
}

function advanceAfterPlay(session: ScrabbleSession): ScrabbleSession {
  const wordsPlayed = session.wordsPlayed + 1;
  if (wordsPlayed >= 6) {
    return { ...session, wordsPlayed, activeSide: "player" };
  }
  const nextSide: ActiveSide = session.activeSide === "player" ? "pet" : "player";
  return { ...session, wordsPlayed, activeSide: nextSide };
}

export function runPetTurn(
  session: ScrabbleSession,
  random: () => number = Math.random,
): ScrabbleSession {
  if (session.activeSide !== "pet" || isSessionComplete(session)) {
    return session;
  }

  const placement = pickPetPlay(session.board, session.petRack, random);
  if (!placement) {
    const fallback: WordPlacement =
      isBoardEmpty(session.board) ?
        { row: 5, col: 4, direction: "across", word: "CAT" }
      : { row: 5, col: 5, direction: "across", word: "AT" };
    const needed = petRackLettersUsed(session.board, fallback);
    if (rackCanSupply(session.petRack, needed) && allWordsValid(
      wordsFormedByPlacement(session.board, fallback),
    )) {
      return commitPetPlacement(session, fallback);
    }
    return session;
  }

  return commitPetPlacement(session, placement);
}

function commitPetPlacement(
  session: ScrabbleSession,
  placement: WordPlacement,
): ScrabbleSession {
  const needed = petRackLettersUsed(session.board, placement);
  const wordScore = scorePlacementWord(placement.word);
  let petRack = consumeFromRack(session.petRack, needed);
  const refill = refillRack(petRack, session.petBag, RACK_SIZE);
  petRack = refill.rack;

  const updated: ScrabbleSession = {
    ...session,
    board: applyPetPlay(session.board, placement),
    petRack,
    petBag: refill.bag,
    petScore: session.petScore + wordScore,
  };

  return advanceAfterPlay(updated);
}

export function computeGoldBonus(playerScore: number): number {
  return 3 + Math.min(15, Math.floor(playerScore / 4));
}
