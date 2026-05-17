/**
 * Vocabulary-set ids for test-start hand-authored lessons (not quiz-compiler menu topics).
 * Planned: `memory_match` screen after letter_mixup (subtype not implemented yet).
 */
export const VOCAB_SET_IDS = ["breakfast_food"] as const;

export type VocabSetId = (typeof VOCAB_SET_IDS)[number];

export type VocabWordCloze = {
  /** Sentence with placeholders __1__, __2__, … */
  template: string;
  acceptable: string[];
};

/** How to phrase "This is …" / "These are …" on word→picture T/F. */
export type VocabLemmaGrammar = "count" | "uncountable" | "plural";

/** Eat/drink choice for “We … for breakfast.” (liquids → drink; jam → none). */
export type VocabMealVerb = "eat" | "drink" | "none";

export type VocabWord = {
  id: string;
  lemma: string;
  imageUrl: string;
  /** One or more cloze lines; one is chosen per run from `seed`. */
  cloze: VocabWordCloze | VocabWordCloze[];
  /** Spoken on tap when using TTS; defaults to lemma. */
  tts?: string;
  /** Drives T/F statement grammar; inferred from lemma when omitted. */
  grammar?: VocabLemmaGrammar;
  /** Meal phrase verb; inferred from lemma when omitted. */
  mealVerb?: VocabMealVerb;
};

export type VocabularySetDefinition = {
  id: VocabSetId;
  title: string;
  coverImageUrl: string;
  words: VocabWord[];
  /** Optional hand-written false T/F lines; otherwise built from other words at screen build time. */
  falseClaims?: Record<string, string[]>;
  /** Word ids omitted from the learn (click-to-reveal) screen only; still in practice/T/F. */
  learnExcludeWordIds?: string[];
};

export type BuildVocabularySetOptions = {
  /** Stable per run; drives shuffle / subset selection. */
  seed?: string;
  /** How many words to use in practice sections (learn uses set minus `learnExcludeWordIds`). */
  practiceCount?: number;
};

export const DEFAULT_PRACTICE_COUNT = 6;

export function isVocabSetId(id: string): id is VocabSetId {
  return (VOCAB_SET_IDS as readonly string[]).includes(id);
}
