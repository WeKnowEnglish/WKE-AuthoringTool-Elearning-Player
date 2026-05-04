export type CefrLevel = "A1" | "A2";

export type QuizMode = "quick" | "practice";

export type QuestionType = "mcq" | "fill_blank" | "letter_scramble";

export type VerbCategory = "action" | "stative" | "auxiliary";

export type StructureIntent =
  | "present_simple_base"
  | "present_simple_3sg"
  | "countable_noun"
  | "uncountable_noun";

export type Structure = {
  id: string;
  template: string;
  target: "vocab" | "verb";
  type: "grammar" | "vocab";
  level: CefrLevel;
  tags: string[];
  intent: StructureIntent;
  /** Reserved for future UI; generation always uses cloze for MCQ/fill_blank and word-level for scramble. */
  displayMode: "cloze" | "full_sentence";
};

export type VocabularyItem = {
  id: string;
  word: string;
  type: "noun" | "verb";
  topic: string;
  level: CefrLevel;
  plural?: string;
  baseForm?: string;
  pastSimple?: string;
  presentSimple3sg?: string;
  image?: string;
  /** Verbs without this field are treated as `"action"` in filters. */
  verbCategory?: VerbCategory;
  /** Nouns without this field are treated as countable (`true`) in filters. */
  countable?: boolean;
};

export type Question = {
  id: string;
  type: QuestionType;
  prompt: string;
  correctAnswer: string;
  options: string[];
  metadata: {
    structureId: string;
    vocabId: string;
    topic: string;
    level: CefrLevel;
  };
};

export type QuizSession = {
  questions: Question[];
  meta: {
    topic: string;
    level: CefrLevel;
    mode: QuizMode;
  };
};

export type GenerateQuizOptions = {
  topic: string;
  level: CefrLevel;
  mode: QuizMode;
  questionCount: number;
};
