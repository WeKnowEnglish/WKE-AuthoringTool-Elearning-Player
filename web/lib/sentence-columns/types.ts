/** Standalone sentence columns authoring document (Activity Bank + homework freeze). */

export const SENTENCE_COLUMN_IDS = ["subject", "action", "extra"] as const;
export type SentenceColumnId = (typeof SENTENCE_COLUMN_IDS)[number];

export type SentenceColumnDef = {
  id: SentenceColumnId;
  label: string;
  prompt: string;
};

export type SentenceColumnPiece = {
  id: string;
  text: string;
  columnId: SentenceColumnId;
};

export type SentenceColumnChallenge = {
  id: string;
  pieces: SentenceColumnPiece[];
};

export type SentenceColumnsDocument = {
  version: 1;
  kind: "sentence-columns";
  id: string;
  title: string;
  instructions: string;
  columns: SentenceColumnDef[];
  challenges: SentenceColumnChallenge[];
  cefr?: string;
};

/** Playable slice shared by template Part 3 and the standalone player. */
export type SentenceColumnsPlayable = {
  title: string;
  instructions: string;
  columns: SentenceColumnDef[];
  challenges: SentenceColumnChallenge[];
};

export const SENTENCE_COLUMNS_KIND = "sentence-columns" as const;
export const DEFAULT_SENTENCE_COLUMNS_INSTRUCTIONS =
  "Choose a sentence part, then place it in the correct column. Read the completed sentence underneath.";
export const DEFAULT_SENTENCE_COLUMNS: SentenceColumnDef[] = [
  { id: "subject", label: "Who?", prompt: "The person or thing" },
  { id: "action", label: "Action", prompt: "What they do" },
  { id: "extra", label: "More information", prompt: "How, where, or what" },
];
