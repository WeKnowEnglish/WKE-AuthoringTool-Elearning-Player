/**
 * Vocabulary-set ids for test-start hand-authored lessons (not quiz-compiler menu topics).
 * Planned: `memory_match` screen after letter_mixup (subtype not implemented yet).
 */
export const VOCAB_SET_IDS = [
  "breakfast_food",
  "wild_animals",
  "pets",
  "sea_animals",
  "farm_animals",
  "clothes_everyday",
  "weather_words",
  "school_supplies",
  "school_activities",
  "body_head_face",
  "body_limbs_inside",
  "jobs_community",
  "jobs_creative",
  "toys_everyday",
  "food_fruit",
  "food_meals",
  "food_snacks",
] as const;

export const FOOD_VOCAB_SET_IDS = [
  "breakfast_food",
  "food_fruit",
  "food_meals",
  "food_snacks",
] as const;

export type FoodVocabSetId = (typeof FOOD_VOCAB_SET_IDS)[number];

export const SCHOOL_VOCAB_SET_IDS = ["school_supplies", "school_activities"] as const;

export type SchoolVocabSetId = (typeof SCHOOL_VOCAB_SET_IDS)[number];

export const BODY_VOCAB_SET_IDS = ["body_head_face", "body_limbs_inside"] as const;

export type BodyVocabSetId = (typeof BODY_VOCAB_SET_IDS)[number];

export const JOBS_VOCAB_SET_IDS = ["jobs_community", "jobs_creative"] as const;

export type JobsVocabSetId = (typeof JOBS_VOCAB_SET_IDS)[number];

export const ANIMAL_VOCAB_SET_IDS = [
  "wild_animals",
  "pets",
  "sea_animals",
  "farm_animals",
] as const;

export type AnimalVocabSetId = (typeof ANIMAL_VOCAB_SET_IDS)[number];

export type VocabSetId = (typeof VOCAB_SET_IDS)[number];

/** Learn spotlight + sticker-match spoken sentences (default = I like / breakfast). */
export type VocabLearnPhraseTheme =
  | "default"
  | "clothes"
  | "weather"
  | "animals"
  | "school_supplies"
  | "school_activities"
  | "school_places"
  | "body_head_face"
  | "body_limbs_inside"
  | "jobs_community"
  | "jobs_creative"
  | "toys_everyday"
  | "food_fruit"
  | "food_meals"
  | "food_snacks";

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
  /** Drives learn spotlight + sticker-match TTS (default when omitted). */
  learnPhraseTheme?: VocabLearnPhraseTheme;
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
  /** Prioritized word ids, usually due review or fragile mastery targets. */
  preferredWordIds?: string[];
};

export const DEFAULT_PRACTICE_COUNT = 6;

export function isVocabSetId(id: string): id is VocabSetId {
  return (VOCAB_SET_IDS as readonly string[]).includes(id);
}
