import { shuffleWithSeed } from "@/lib/vocabulary-templates/shuffle";

export type DepositSpellSlotCell = {
  bankKey: string;
  char: string;
  locked: boolean;
};

export type DepositSpellTileState = {
  slots: (DepositSpellSlotCell | null)[];
};

export function bankKeyForIndex(index: number, char: string): string {
  return `${index}:${char}`;
}

export function splitTargetWordLetters(targetWord: string): string[] {
  return [...targetWord];
}

export function buildDepositLetterPayload(
  targetWord: string,
  shuffleSeed: string,
): {
  letterBank: string[];
  slotCount: number;
  answerLetters: string[];
} {
  const answerLetters = splitTargetWordLetters(targetWord);
  return {
    answerLetters,
    slotCount: answerLetters.length,
    letterBank: shuffleWithSeed(answerLetters, `${shuffleSeed}:deposit-letters`),
  };
}

export function createInitialSpellTileState(slotCount: number): DepositSpellTileState {
  return {
    slots: Array.from({ length: Math.max(0, slotCount) }, () => null),
  };
}

export function isLetterCorrectForSlot(
  answerLetters: readonly string[],
  slotIndex: number,
  letter: string,
): boolean {
  const expected = answerLetters[slotIndex];
  if (!expected) return false;
  return expected.toLowerCase() === letter.toLowerCase();
}

export function isBankKeyInUse(state: DepositSpellTileState, bankKey: string): boolean {
  return state.slots.some((slot) => slot?.bankKey === bankKey);
}

export function placeLetterFromBank(
  state: DepositSpellTileState,
  answerLetters: readonly string[],
  bankKey: string,
  letter: string,
): DepositSpellTileState {
  if (isBankKeyInUse(state, bankKey)) return state;
  const emptyIndex = state.slots.findIndex((slot) => slot === null);
  if (emptyIndex === -1) return state;

  const locked = isLetterCorrectForSlot(answerLetters, emptyIndex, letter);
  const nextSlots = [...state.slots];
  nextSlots[emptyIndex] = { bankKey, char: letter, locked };
  return { slots: nextSlots };
}

export function returnLetterToBank(
  state: DepositSpellTileState,
  slotIndex: number,
): DepositSpellTileState {
  const slot = state.slots[slotIndex];
  if (!slot || slot.locked) return state;
  const nextSlots = [...state.slots];
  nextSlots[slotIndex] = null;
  return { slots: nextSlots };
}

export function getNextHintPlacement(
  state: DepositSpellTileState,
  answerLetters: readonly string[],
  letterBank: readonly string[],
): { slotIndex: number; letter: string; bankKey: string } | null {
  const slotIndex = state.slots.findIndex((slot) => slot === null);
  if (slotIndex === -1) return null;

  const letter = answerLetters[slotIndex];
  if (!letter) return null;

  const bankIndex = letterBank.findIndex(
    (bankLetter, index) =>
      bankLetter.toLowerCase() === letter.toLowerCase() &&
      !isBankKeyInUse(state, bankKeyForIndex(index, bankLetter)),
  );
  if (bankIndex === -1) return null;

  return {
    slotIndex,
    letter: letterBank[bankIndex]!,
    bankKey: bankKeyForIndex(bankIndex, letterBank[bankIndex]!),
  };
}

export function applyHint(
  state: DepositSpellTileState,
  answerLetters: readonly string[],
  letterBank: readonly string[],
): DepositSpellTileState {
  const placement = getNextHintPlacement(state, answerLetters, letterBank);
  if (!placement) return state;

  const nextSlots = [...state.slots];
  nextSlots[placement.slotIndex] = {
    bankKey: placement.bankKey,
    char: placement.letter,
    locked: true,
  };
  return { slots: nextSlots };
}

export function isReadyToSubmit(state: DepositSpellTileState, slotCount: number): boolean {
  if (state.slots.length !== slotCount) return false;
  return state.slots.every((slot) => slot !== null && slot.locked);
}

export function buildSpellingFromSlots(state: DepositSpellTileState): string {
  return state.slots.map((slot) => slot?.char ?? "").join("");
}
