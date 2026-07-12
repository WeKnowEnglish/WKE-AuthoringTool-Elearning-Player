export type LiveGameQuestionBank = "harvest" | "deposit" | "craft";

export type HarvestMcPayload = {
  type: "multiple_choice";
  options: string[];
  correctAnswers: string[];
};

export type DepositSpellPayload = {
  type: "deposit_spell";
  targetWord: string;
  spellHint: string;
};

export type CraftSentencePayload = {
  type: "drag_sentence";
  wordBank: string[];
  correctOrder: string[];
  slotCount: number;
};

export type LiveGameQuestionPayload =
  | HarvestMcPayload
  | DepositSpellPayload
  | CraftSentencePayload;

export type LiveGameQuestionRow = {
  id: string;
  setId: string;
  bank: LiveGameQuestionBank;
  sortOrder: number;
  prompt: string;
  payload: LiveGameQuestionPayload;
  enabled: boolean;
  legacySourceId: string | null;
};

export type LiveGameQuestionSetRow = {
  id: string;
  slug: string;
  title: string;
  level: "A1" | "A2";
  topic: string;
  learningObjective: string;
  description: string;
  version: number;
  status: "draft" | "published";
  visibility: "system" | "teacher";
  sortOrder: number;
  createdBy?: string | null;
};

export type LiveGameQuestionSetEditorPayload = {
  set: LiveGameQuestionSetRow;
  questions: {
    harvest: LiveGameQuestionRow[];
    deposit: LiveGameQuestionRow[];
    craft: LiveGameQuestionRow[];
  };
};

export type LiveGameQuestionSetSnapshot = LiveGameQuestionSetRow & {
  harvest: LiveGameQuestionRow[];
  deposit: LiveGameQuestionRow[];
  craft: LiveGameQuestionRow[];
};

export type LiveGameQuestionSetSummaryFromDb = {
  id: string;
  slug: string;
  title: string;
  level: "A1" | "A2";
  topic: string;
  learningObjective: string;
  description: string;
  version: number;
  visibility: "system" | "teacher";
  harvestCount: number;
  depositCount: number;
  craftCount: number;
};

/** Host carousel card — safe to send to the browser (no answer payloads). */
export type LiveGameQuestionSetCard = {
  id: string;
  slug: string;
  title: string;
  level: "A1" | "A2";
  topic: string;
  learningObjective: string;
  description: string;
  version: number;
  visibility: "system" | "teacher";
  harvestCount: number;
  depositCount: number;
  craftCount: number;
  questionCount: number;
};
