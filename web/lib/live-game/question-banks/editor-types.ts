import type {
  CraftSentencePayload,
  DepositSpellPayload,
  HarvestMcPayload,
  LiveGameQuestionBank,
} from "@/lib/live-game/question-banks/types";

export const DEFAULT_HARVEST_PAYLOAD: HarvestMcPayload = {
  type: "multiple_choice",
  options: ["", ""],
  correctAnswers: [],
};

export const DEFAULT_DEPOSIT_PAYLOAD: DepositSpellPayload = {
  type: "deposit_spell",
  targetWord: "word",
  spellHint: "Definition hint",
};

export const DEFAULT_CRAFT_PAYLOAD: CraftSentencePayload = {
  type: "drag_sentence",
  wordBank: ["I"],
  correctOrder: ["I"],
  slotCount: 1,
};

export function defaultPayloadForBank(bank: LiveGameQuestionBank) {
  switch (bank) {
    case "harvest":
      return { ...DEFAULT_HARVEST_PAYLOAD, options: ["", ""], correctAnswers: [] };
    case "deposit":
      return { ...DEFAULT_DEPOSIT_PAYLOAD };
    case "craft":
      return { ...DEFAULT_CRAFT_PAYLOAD, wordBank: ["I"], correctOrder: ["I"], slotCount: 1 };
  }
}

export function defaultPromptForBank(bank: LiveGameQuestionBank): string {
  switch (bank) {
    case "harvest":
      return "Choose the correct answer:";
    case "deposit":
      return "Spell this word:";
    case "craft":
      return "Put the words in order:";
  }
}
