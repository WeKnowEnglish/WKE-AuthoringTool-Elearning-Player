export type LiveGameSafeHarvestQuestion = {
  id: string;
  clientId: string;
  prompt: string;
  options: string[];
};

export type LiveGameSafeDepositQuestion = {
  id: string;
  clientId: string;
  prompt: string;
  spellHint: string;
  slotCount: number;
};

export type LiveGameSafeCraftQuestion = {
  id: string;
  clientId: string;
  prompt: string;
  wordBank: string[];
  slotCount: number;
};

export type LiveGameSafeQuestionBundle = {
  roomId: string;
  questionSetId: string;
  questionSetVersion: number;
  harvest: LiveGameSafeHarvestQuestion[];
  deposit: LiveGameSafeDepositQuestion[];
  craft: LiveGameSafeCraftQuestion[];
};
