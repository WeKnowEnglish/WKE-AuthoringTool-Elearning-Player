import { describe, expect, it } from "vitest";
import {
  applyHint,
  bankKeyForIndex,
  buildDepositLetterPayload,
  buildSpellingFromSlots,
  createInitialSpellTileState,
  isLetterCorrectForSlot,
  isReadyToSubmit,
  placeLetterFromBank,
  returnLetterToBank,
} from "@/lib/live-game/modes/english-craft/deposit-spell-tiles";

describe("english-craft phase 4g deposit spell tiles", () => {
  it("builds a shuffled letter bank with stable ordering per seed", () => {
    const first = buildDepositLetterPayload("tiny", "challenge-a");
    const second = buildDepositLetterPayload("tiny", "challenge-a");
    const third = buildDepositLetterPayload("tiny", "challenge-b");

    expect(first.slotCount).toBe(4);
    expect(first.answerLetters).toEqual(["t", "i", "n", "y"]);
    expect(first.letterBank).toHaveLength(4);
    expect([...first.letterBank].sort().join("")).toBe([...first.answerLetters].sort().join(""));
    expect(second.letterBank).toEqual(first.letterBank);
    expect(third.letterBank).not.toEqual(first.letterBank);
  });

  it("locks correct letters when placed in the next empty slot", () => {
    const answerLetters = ["e", "n", "o", "r", "m", "o", "u", "s"];
    let state = createInitialSpellTileState(answerLetters.length);

    state = placeLetterFromBank(
      state,
      answerLetters,
      bankKeyForIndex(0, "x"),
      "x",
    );
    expect(state.slots[0]?.locked).toBe(false);

    state = returnLetterToBank(state, 0);
    state = placeLetterFromBank(
      state,
      answerLetters,
      bankKeyForIndex(1, "e"),
      "e",
    );
    expect(state.slots[0]?.char).toBe("e");
    expect(state.slots[0]?.locked).toBe(true);
  });

  it("returns unlocked letters to the bank", () => {
    const answerLetters = ["t", "i", "n", "y"];
    let state = createInitialSpellTileState(answerLetters.length);
    state = placeLetterFromBank(
      state,
      answerLetters,
      bankKeyForIndex(0, "x"),
      "x",
    );
    state = returnLetterToBank(state, 0);
    expect(state.slots[0]).toBeNull();
  });

  it("fills the next empty slot with a locked hint letter", () => {
    const payload = buildDepositLetterPayload("tiny", "hint-seed");
    let state = createInitialSpellTileState(payload.slotCount);

    state = applyHint(state, payload.answerLetters, payload.letterBank);
    expect(state.slots[0]?.char).toBe("t");
    expect(state.slots[0]?.locked).toBe(true);

    state = applyHint(state, payload.answerLetters, payload.letterBank);
    expect(state.slots[1]?.char).toBe("i");
    expect(state.slots[1]?.locked).toBe(true);
  });

  it("only allows submit when every slot is filled and locked", () => {
    const payload = buildDepositLetterPayload("tiny", "submit-seed");
    let state = createInitialSpellTileState(payload.slotCount);

    expect(isReadyToSubmit(state, payload.slotCount)).toBe(false);

    for (let index = 0; index < payload.slotCount; index += 1) {
      state = applyHint(state, payload.answerLetters, payload.letterBank);
    }

    expect(isReadyToSubmit(state, payload.slotCount)).toBe(true);
    expect(buildSpellingFromSlots(state)).toBe("tiny");
  });

  it("checks slot letters case-insensitively", () => {
    expect(isLetterCorrectForSlot(["T", "i", "n", "y"], 0, "t")).toBe(true);
    expect(isLetterCorrectForSlot(["T", "i", "n", "y"], 1, "N")).toBe(false);
  });
});
