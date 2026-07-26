import { validateVocabularyListDocument } from "@/lib/activity-builder/vocabulary-list/document";
import type { VocabularyListDocument } from "@/lib/activity-builder/vocabulary-list/types";
import {
  getActivityLibraryEntry,
  newActivityLibraryId,
  putActivityLibraryEntry,
} from "@/lib/activity-library/idb";
import type { ActivityLibraryEntry } from "@/lib/activity-library/types";

/** Save a vocabulary list into the local Activity Library (create or update). */
export async function saveVocabularyListToLibrary(input: {
  libraryId: string | null;
  document: VocabularyListDocument;
}): Promise<ActivityLibraryEntry> {
  const authoring = validateVocabularyListDocument(input.document);
  const now = new Date().toISOString();
  const existing = input.libraryId ? await getActivityLibraryEntry(input.libraryId) : null;
  const entry: ActivityLibraryEntry = {
    id: existing?.id ?? input.libraryId ?? newActivityLibraryId(),
    format: "vocabulary_list",
    name: authoring.name,
    updatedAt: now,
    authoring,
    lastExport: existing?.lastExport,
  };
  return putActivityLibraryEntry(entry);
}

export function readVocabularyListFromLibraryEntry(
  entry: ActivityLibraryEntry,
): VocabularyListDocument {
  if (entry.format !== "vocabulary_list") {
    throw new Error("This library entry is not a vocabulary list.");
  }
  return validateVocabularyListDocument(entry.authoring);
}
