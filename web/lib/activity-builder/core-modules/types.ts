import type { GradedActivityPolicy } from "@/lib/graded-activities/types";

/**
 * Core activity module ids — procedural vocab-compile formats (V1 suite).
 * Keep in sync with Learning Track `vocab_compile` beat kinds where applicable.
 */
export const CORE_MODULE_IDS = [
  "multiple_choice",
  "letter_mixup",
  "flashcards",
  "listen_and_choose",
  "line_match",
  "true_false",
  "sentence_scramble",
  "fill_blanks",
  "wordsearch",
  "crossword",
  "memory",
] as const;

export type CoreModuleId = (typeof CORE_MODULE_IDS)[number];

export const CORE_MODULE_GRADING_POLICIES: Record<
  CoreModuleId,
  GradedActivityPolicy
> = {
  multiple_choice: "automatic",
  letter_mixup: "automatic",
  flashcards: "completion",
  listen_and_choose: "automatic",
  line_match: "automatic",
  true_false: "automatic",
  sentence_scramble: "automatic",
  fill_blanks: "automatic",
  wordsearch: "completion",
  crossword: "completion",
  memory: "completion",
};

export function getCoreModuleGradingPolicy(id: CoreModuleId): GradedActivityPolicy {
  return CORE_MODULE_GRADING_POLICIES[id];
}


export function isCoreModuleId(value: string): value is CoreModuleId {
  return (CORE_MODULE_IDS as readonly string[]).includes(value);
}

export type CoreModuleMeta = {
  id: CoreModuleId;
  title: string;
  description: string;
  /** Learning Track beat kind when the format is track-eligible. */
  beatKind: CoreModuleId;
  href: string;
};

export const CORE_MODULE_META: Record<CoreModuleId, CoreModuleMeta> = {
  multiple_choice: {
    id: "multiple_choice",
    title: "Multiple choice",
    description: "Choose the correct word for a picture or prompt.",
    beatKind: "multiple_choice",
    href: "/teacher/activity-builder/quizzes",
  },
  letter_mixup: {
    id: "letter_mixup",
    title: "Letter scramble",
    description: "Unscramble letters to spell each target word.",
    beatKind: "letter_mixup",
    href: "/teacher/activity-builder/quizzes",
  },
  flashcards: {
    id: "flashcards",
    title: "Flashcards",
    description: "Flip cards to study pictures, words, and examples.",
    beatKind: "flashcards",
    href: "/teacher/activity-builder/quizzes",
  },
  listen_and_choose: {
    id: "listen_and_choose",
    title: "Listen and choose",
    description: "Hear a prompt, then tap the matching picture.",
    beatKind: "listen_and_choose",
    href: "/teacher/activity-builder/quizzes",
  },
  line_match: {
    id: "line_match",
    title: "Line match",
    description: "Draw lines from words to matching pictures.",
    beatKind: "line_match",
    href: "/teacher/activity-builder/quizzes",
  },
  true_false: {
    id: "true_false",
    title: "True / false",
    description: "Judge picture and meaning statements.",
    beatKind: "true_false",
    href: "/teacher/activity-builder/quizzes",
  },
  sentence_scramble: {
    id: "sentence_scramble",
    title: "Sentence scramble",
    description: "Reorder words into a correct sentence.",
    beatKind: "sentence_scramble",
    href: "/teacher/activity-builder/quizzes",
  },
  fill_blanks: {
    id: "fill_blanks",
    title: "Fill in the blanks",
    description: "Choose the missing word in a short sentence.",
    beatKind: "fill_blanks",
    href: "/teacher/activity-builder/quizzes",
  },
  wordsearch: {
    id: "wordsearch",
    title: "Word search",
    description: "Find vocabulary hidden across a letter grid.",
    beatKind: "wordsearch",
    href: "/teacher/activity-builder/quizzes",
  },
  crossword: {
    id: "crossword",
    title: "Crossword",
    description: "Use definitions and examples to complete a vocabulary crossword.",
    beatKind: "crossword",
    href: "/teacher/activity-builder/quizzes",
  },
  memory: {
    id: "memory",
    title: "Memory",
    description: "Match each word to its picture or meaning.",
    beatKind: "memory",
    href: "/teacher/activity-builder/quizzes",
  },
};

export function getCoreModuleMeta(id: CoreModuleId): CoreModuleMeta {
  return CORE_MODULE_META[id];
}
