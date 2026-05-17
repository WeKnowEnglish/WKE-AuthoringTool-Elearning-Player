import { describe, expect, it } from "vitest";
import {
  VOCAB_LEARN_BTN_LABEL_NEW_WORD,
  VOCAB_LEARN_BTN_LABEL_NEXT,
  VOCAB_LEARN_BTN_LABEL_STICKER_MODE,
  VOCAB_LEARN_DONE_PHASE_ID,
  VOCAB_LEARN_BORDER_SLOT,
  VOCAB_LEARN_PLAY_PHASE_ID,
  VOCAB_LEARN_SPOTLIGHT,
  isVocabLearnReplayPhase,
  isVocabLearnSettledImagePhase,
  learnSettledImageLayout,
} from "./vocab-learn-new-word";

describe("vocab learn replay helpers", () => {
  it("identifies replay-eligible phases", () => {
    expect(isVocabLearnReplayPhase(VOCAB_LEARN_PLAY_PHASE_ID)).toBe(true);
    expect(isVocabLearnReplayPhase(VOCAB_LEARN_DONE_PHASE_ID)).toBe(true);
    expect(isVocabLearnReplayPhase("learn-intro")).toBe(false);
  });

  it("identifies settled image phase", () => {
    expect(isVocabLearnSettledImagePhase("settled")).toBe(true);
    expect(isVocabLearnSettledImagePhase("spotlight")).toBe(false);
    expect(isVocabLearnSettledImagePhase(undefined)).toBe(false);
  });

  it("uses border slot size for settled image layout (not spotlight payload)", () => {
    const ids = ["bread", "milk", "juice"];
    const layout = learnSettledImageLayout("learn-bread-img", ids);
    expect(layout.w).toBe(VOCAB_LEARN_BORDER_SLOT.w);
    expect(layout.h).toBe(VOCAB_LEARN_BORDER_SLOT.h);
    expect(layout.w).toBeLessThan(VOCAB_LEARN_SPOTLIGHT.w);
    expect(layout.h).toBeLessThan(VOCAB_LEARN_SPOTLIGHT.h);
  });

  it("exposes learn button labels for sticker flow", () => {
    expect(VOCAB_LEARN_BTN_LABEL_NEW_WORD).toBe("New word");
    expect(VOCAB_LEARN_BTN_LABEL_STICKER_MODE).toBe("Sticker mode");
    expect(VOCAB_LEARN_BTN_LABEL_NEXT).toBe("Next");
  });
});
