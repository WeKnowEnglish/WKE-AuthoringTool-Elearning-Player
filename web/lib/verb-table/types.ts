/** Standalone verb table authoring document (Activity Bank + homework freeze). */

export const VERB_FORM_COLUMNS = ["base", "past", "participle"] as const;
export type VerbFormColumn = (typeof VERB_FORM_COLUMNS)[number];

export type VerbTableForms = Record<VerbFormColumn, string>;

export type VerbTableRow = {
  id: string;
  forms: VerbTableForms;
  /** 1–2 columns the student must fill. */
  missing: VerbFormColumn[];
};

export type VerbTableColumnDef = {
  id: VerbFormColumn;
  label: string;
};

export type VerbTableDocument = {
  version: 1;
  kind: "verb-table";
  id: string;
  title: string;
  instructions: string;
  columns: VerbTableColumnDef[];
  rows: VerbTableRow[];
  cefr?: string;
};

/** Playable slice shared by template Part 4 and the standalone player. */
export type VerbTablePlayable = {
  title: string;
  instructions: string;
  columns: VerbTableColumnDef[];
  rows: VerbTableRow[];
};

export const VERB_TABLE_KIND = "verb-table" as const;
export const DEFAULT_VERB_TABLE_INSTRUCTIONS =
  "Use the given verb forms to complete each empty cell.";
export const DEFAULT_VERB_TABLE_COLUMNS: VerbTableColumnDef[] = [
  { id: "base", label: "Base verb" },
  { id: "past", label: "Past tense" },
  { id: "participle", label: "Past participle" },
];
