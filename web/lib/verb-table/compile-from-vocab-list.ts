import { MASTER_VOCABULARY } from "@/lib/curated-sentences/master-vocabulary";
import type { VocabularyEntry } from "@/lib/curated-sentences/master-vocabulary";
import { resolveVocabCompileEntries } from "@/lib/activity-builder/games/compile-from-vocab-list";
import type { VocabularyListDocument } from "@/lib/activity-builder/vocabulary-list/types";
import {
  DEFAULT_VERB_TABLE_COLUMNS,
  DEFAULT_VERB_TABLE_INSTRUCTIONS,
  VERB_FORM_COLUMNS,
  VERB_TABLE_KIND,
  type VerbFormColumn,
  type VerbTableDocument,
  type VerbTableForms,
  type VerbTableRow,
} from "@/lib/verb-table/types";
import { validateVerbTableDocument } from "@/lib/verb-table/document";

function slugifyId(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || "verb-table";
}

function normalizeLemma(value: string): string {
  return value.trim().toLocaleLowerCase();
}

/** Resolve a verb lexicon entry by lemma / base / past / participle surface. */
export function lookupVerbEntry(word: string): VocabularyEntry | null {
  const key = normalizeLemma(word);
  if (!key) return null;
  const entry = MASTER_VOCABULARY.entries.find((candidate) => {
    if (candidate.pos !== "verb") return false;
    if (normalizeLemma(candidate.lemma) === key) return true;
    if (normalizeLemma(candidate.forms.base) === key) return true;
    if (candidate.forms.past && normalizeLemma(candidate.forms.past) === key) return true;
    if (
      candidate.forms.past_participle &&
      normalizeLemma(candidate.forms.past_participle) === key
    ) {
      return true;
    }
    return false;
  });
  return entry ?? null;
}

export function verbFormsFromEntry(entry: VocabularyEntry): VerbTableForms | null {
  const base = entry.forms.base?.trim();
  const pastRaw = entry.forms.past?.trim();
  const participle = entry.forms.past_participle?.trim();
  if (!base || !pastRaw || !participle) return null;

  // Match Homework Template One: be past accepts was/were.
  const past =
    normalizeLemma(base) === "be" || normalizeLemma(entry.lemma) === "be"
      ? "was/were"
      : pastRaw;

  return { base, past, participle };
}

/** Rotate which cells are blank so each row isn’t trivially the same pattern. */
export function pickMissingColumns(rowIndex: number): VerbFormColumn[] {
  const patterns: VerbFormColumn[][] = [
    ["past"],
    ["participle"],
    ["past", "participle"],
    ["base"],
    ["past"],
    ["participle"],
  ];
  return [...(patterns[rowIndex % patterns.length] ?? ["past"])];
}

export type CompileVerbTableFromVocabListInput = {
  list: VocabularyListDocument;
  selectedEntryIds?: string[];
  maxRows?: number;
};

/**
 * Build a verb table from vocabulary list words that resolve in the curated
 * verb lexicon (base + past + past participle).
 */
export function compileVerbTableFromVocabList(
  input: CompileVerbTableFromVocabListInput,
): VerbTableDocument {
  const entries = resolveVocabCompileEntries(input.list, input.selectedEntryIds);
  if (entries.length < 1) {
    throw new Error("Select at least one vocabulary word.");
  }

  const maxRows = Math.max(1, Math.min(12, Math.round(input.maxRows ?? 6)));
  const rows: VerbTableRow[] = [];
  const seen = new Set<string>();

  for (const entry of entries) {
    if (rows.length >= maxRows) break;
    const verb = lookupVerbEntry(entry.word);
    if (!verb) continue;
    const forms = verbFormsFromEntry(verb);
    if (!forms) continue;
    const key = normalizeLemma(forms.base);
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({
      id: `verb-${verb.id}`,
      forms,
      missing: pickMissingColumns(rows.length),
    });
  }

  if (rows.length < 1) {
    throw new Error(
      "No verbs with full base/past/participle forms found in this list. Try words like go, see, write, or load the sample table.",
    );
  }

  const listName = input.list.name.trim() || "Vocabulary";
  const title = `${listName} · Verb table`;
  return validateVerbTableDocument({
    version: 1,
    kind: VERB_TABLE_KIND,
    id: slugifyId(title),
    title,
    instructions: DEFAULT_VERB_TABLE_INSTRUCTIONS,
    columns: DEFAULT_VERB_TABLE_COLUMNS,
    rows,
    ...(input.list.cefr ? { cefr: input.list.cefr } : {}),
  });
}

/** Ensure every VERB_FORM_COLUMNS id appears in missing picker helpers. */
export function allVerbFormColumns(): readonly VerbFormColumn[] {
  return VERB_FORM_COLUMNS;
}
