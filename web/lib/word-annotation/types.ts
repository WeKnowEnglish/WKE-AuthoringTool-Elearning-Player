/** Standalone word annotation authoring document (Activity Bank + homework freeze). */

export const WORD_ANNOTATION_ROLES = ["adjective", "adverb"] as const;
export type WordAnnotationRole = (typeof WORD_ANNOTATION_ROLES)[number];

export type WordAnnotationToken = {
  id: string;
  text: string;
  /** Null = not a target; student should leave unmarked. */
  role: WordAnnotationRole | null;
};

export type WordAnnotationSentence = {
  id: string;
  tokens: WordAnnotationToken[];
};

export type WordAnnotationDocument = {
  version: 1;
  kind: "word-annotation";
  id: string;
  title: string;
  instructions: string;
  rememberText: string;
  sentences: WordAnnotationSentence[];
  cefr?: string;
};

/** Playable slice shared by template Part 2 and the standalone player. */
export type WordAnnotationPlayable = {
  title: string;
  instructions: string;
  rememberText: string;
  sentences: WordAnnotationSentence[];
};

export const WORD_ANNOTATION_KIND = "word-annotation" as const;
export const DEFAULT_WORD_ANNOTATION_INSTRUCTIONS =
  "Circle the adjectives. Underline the adverbs. Choose a marking tool, then tap the words.";
export const DEFAULT_WORD_ANNOTATION_REMEMBER =
  "An adjective describes a thing. An adverb describes an action.";
