/** Standalone question writing authoring document (Activity Bank + homework freeze). */

export type QuestionWritingWorkedExample = {
  prompt: string;
  question: string;
  answer: string;
};

export type QuestionWritingPrompt = {
  id: string;
  promptWords: string[];
  requiredWords: string[];
  questionWord: string;
  helpingVerbs: string[];
  minWords: number;
  /** Authoring / teacher hint — not shown as an answer key in the student player. */
  modelQuestion: string;
};

export type QuestionWritingDocument = {
  version: 1;
  kind: "question-writing";
  id: string;
  title: string;
  instructions: string;
  workedExample: QuestionWritingWorkedExample;
  prompts: QuestionWritingPrompt[];
  cefr?: string;
};

/** Playable slice shared by template Part 6 and the standalone player. */
export type QuestionWritingPlayable = {
  title: string;
  instructions: string;
  workedExample: QuestionWritingWorkedExample;
  prompts: QuestionWritingPrompt[];
};

export const QUESTION_WRITING_KIND = "question-writing" as const;
export const DEFAULT_QUESTION_WRITING_INSTRUCTIONS =
  "Use the prompts to write Have you ever...? questions. Change each verb to its past participle.";
