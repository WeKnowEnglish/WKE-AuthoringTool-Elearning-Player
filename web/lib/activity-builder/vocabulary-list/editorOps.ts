import {
  normalizeVocabLemma,
} from "@/lib/activity-builder/vocabulary-list/from-lexicon";
import type {
  VocabListEntry,
  VocabularyListDocument,
} from "@/lib/activity-builder/vocabulary-list/types";

function uniqueEntryId(entries: VocabListEntry[]): string {
  let n = entries.length + 1;
  const taken = new Set(entries.map((entry) => entry.id));
  while (taken.has(`v${n}`)) n += 1;
  return `v${n}`;
}

export function addVocabEntry(document: VocabularyListDocument): VocabularyListDocument {
  const entry: VocabListEntry = {
    id: uniqueEntryId(document.entries),
    word: "",
  };
  return {
    ...document,
    entries: [...document.entries, entry],
  };
}

export type AddVocabFromLexiconResult =
  | {
      ok: true;
      document: VocabularyListDocument;
      entryId: string;
    }
  | {
      ok: false;
      reason: "duplicate_source" | "duplicate_word" | "empty_word";
    };

/** Append a lexicon-sourced row; skips duplicates by sourceWordId or lemma. */
export function addVocabEntryFromFields(
  document: VocabularyListDocument,
  fields: Omit<VocabListEntry, "id">,
): AddVocabFromLexiconResult {
  const word = fields.word.trim();
  if (!word) return { ok: false, reason: "empty_word" };

  const sourceWordId = fields.sourceWordId?.trim() || undefined;
  if (sourceWordId) {
    const existingSource = document.entries.find(
      (entry) => entry.sourceWordId === sourceWordId,
    );
    if (existingSource) {
      return { ok: false, reason: "duplicate_source" };
    }
  }

  const lemmaKey = normalizeVocabLemma(word);
  const existingWord = document.entries.find(
    (entry) => normalizeVocabLemma(entry.word) === lemmaKey,
  );
  if (existingWord) {
    return { ok: false, reason: "duplicate_word" };
  }

  const entry: VocabListEntry = {
    id: uniqueEntryId(document.entries),
    word,
    ...(fields.definitionEn?.trim()
      ? { definitionEn: fields.definitionEn.trim() }
      : {}),
    ...(fields.example?.trim() ? { example: fields.example.trim() } : {}),
    ...(fields.notes?.trim() ? { notes: fields.notes.trim() } : {}),
    ...(fields.imageUrl?.trim() ? { imageUrl: fields.imageUrl.trim() } : {}),
    ...(fields.imageFit === "cover" || fields.imageFit === "contain"
      ? { imageFit: fields.imageFit }
      : {}),
    ...(fields.audioUrl?.trim() ? { audioUrl: fields.audioUrl.trim() } : {}),
    ...(fields.exampleAudioUrl?.trim()
      ? { exampleAudioUrl: fields.exampleAudioUrl.trim() }
      : {}),
    ...(fields.definitionAudioUrl?.trim()
      ? { definitionAudioUrl: fields.definitionAudioUrl.trim() }
      : {}),
    ...(sourceWordId ? { sourceWordId } : {}),
  };

  return {
    ok: true,
    entryId: entry.id,
    document: {
      ...document,
      entries: [...document.entries, entry],
    },
  };
}

export function removeVocabEntry(
  document: VocabularyListDocument,
  entryId: string,
): VocabularyListDocument {
  if (document.entries.length <= 1) {
    throw new Error("Keep at least one word.");
  }
  return {
    ...document,
    entries: document.entries.filter((entry) => entry.id !== entryId),
  };
}

export function patchVocabEntry(
  document: VocabularyListDocument,
  entryId: string,
  patch: Partial<VocabListEntry>,
): VocabularyListDocument {
  return {
    ...document,
    entries: document.entries.map((entry) =>
      entry.id === entryId ? { ...entry, ...patch } : entry,
    ),
  };
}

export function renameVocabularyList(
  document: VocabularyListDocument,
  name: string,
): VocabularyListDocument {
  return { ...document, name };
}
