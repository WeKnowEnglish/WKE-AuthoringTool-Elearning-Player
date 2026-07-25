/** Closed chunk roles so multiple patterns (like + -ing, can + verb, …) reuse one engine. */
export const LANGUAGE_IN_FOCUS_CHUNK_ROLES = [
  "person",
  "feeling",
  "activity",
  "subject",
  "modal",
  "verb",
  "object",
  "other",
] as const;

export type LanguageInFocusChunkRole =
  (typeof LANGUAGE_IN_FOCUS_CHUNK_ROLES)[number];

/** Workbench element kinds rendered in authoring order. */
export const LANGUAGE_IN_FOCUS_WORKBENCH_TYPES = [
  "example_tabs",
  "chunk_dissection",
  "slot_chooser",
  "action_row",
] as const;

export type LanguageInFocusWorkbenchType =
  (typeof LANGUAGE_IN_FOCUS_WORKBENCH_TYPES)[number];

export const LANGUAGE_IN_FOCUS_ACTIONS = [
  "hear_sentence",
  "cycle_slot",
] as const;

export type LanguageInFocusAction = (typeof LANGUAGE_IN_FOCUS_ACTIONS)[number];
