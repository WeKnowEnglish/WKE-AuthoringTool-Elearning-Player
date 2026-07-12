export type EnglishCraftMcQuestionClient = {
  id: string;
  type: "multiple_choice";
  prompt: string;
  options: string[];
};

export type EnglishCraftCraftQuestionClient = {
  id: string;
  type: "drag_sentence";
  prompt: string;
  wordBank: string[];
  slotCount: number;
};

export const ENGLISH_CRAFT_MC_PREVIEW: EnglishCraftMcQuestionClient = {
  id: "loading-vocab-question",
  type: "multiple_choice",
  prompt: "Getting your vocabulary question...",
  options: [],
};

export const ENGLISH_CRAFT_CRAFT_PREVIEW: EnglishCraftCraftQuestionClient = {
  id: "loading-craft-question",
  type: "drag_sentence",
  prompt: "Getting your bridge challenge...",
  wordBank: [],
  slotCount: 0,
};
