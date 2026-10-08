import type { VocabularyListDocument } from "@/lib/activity-builder/vocabulary-list/types";
import type { VocabActivityGenerationRecipe } from "@/lib/activity-library/compile-quizzes-from-vocab-studio";

export const LESSON_VOCABULARY_FORMATS = ["flashcards", "multiple_choice"] as const;
export type LessonVocabularyFormat = (typeof LESSON_VOCABULARY_FORMATS)[number];
export type LessonVocabularySource = { vocabListId: string; name: string };

/** Kept with the material so a reopened plan retains its selected inputs. */
export type LessonVocabularyGeneration = {
  version: 1;
  adapterVersion: 1;
  lessonId: string;
  sourceName: string;
  inputHash: string;
  generatedAt: string;
  recipe: VocabActivityGenerationRecipe & { format: LessonVocabularyFormat; selectedEntryIds: string[] };
};

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function normalizeLessonVocabularySources(raw: unknown): LessonVocabularySource[] {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw) || raw.length > 20) throw new Error("A lesson can contain up to 20 vocabulary lists.");
  const seen = new Set<string>();
  return raw.map((item) => {
    if (!item || typeof item !== "object" || !isUuid(item.vocabListId)) throw new Error("Invalid lesson vocabulary list.");
    const vocabListId = item.vocabListId.toLowerCase();
    if (seen.has(vocabListId)) throw new Error("This vocabulary list is already attached.");
    seen.add(vocabListId);
    return { vocabListId, name: typeof item.name === "string" ? item.name.trim().slice(0, 120) : "Vocabulary list" };
  });
}

export function normalizeLessonVocabularyGeneration(raw: unknown): LessonVocabularyGeneration | undefined {
  if (raw === undefined) return undefined;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Invalid lesson generation recipe.");
  const value = raw as LessonVocabularyGeneration;
  const recipe = value.recipe;
  if (value.version !== 1 || value.adapterVersion !== 1 || !isUuid(value.lessonId) ||
      typeof value.inputHash !== "string" || !/^[a-f0-9]{64}$/.test(value.inputHash) ||
      typeof value.generatedAt !== "string" || !Number.isFinite(Date.parse(value.generatedAt)) ||
      !recipe || recipe.kind !== "vocabulary_list" || recipe.version !== 1 || !isUuid(recipe.vocabListId) ||
      !LESSON_VOCABULARY_FORMATS.includes(recipe.format) || !Array.isArray(recipe.selectedEntryIds) ||
      recipe.selectedEntryIds.length < 1 || recipe.selectedEntryIds.length > 500 ||
      recipe.selectedEntryIds.some((id) => typeof id !== "string" || !id.trim() || id.length > 200) ||
      new Set(recipe.selectedEntryIds).size !== recipe.selectedEntryIds.length) {
    throw new Error("Invalid lesson generation recipe.");
  }
  // Settings are fixed by this version of the adapter, not trusted client options.
  return {
    version: 1, adapterVersion: 1, lessonId: value.lessonId,
    sourceName: typeof value.sourceName === "string" ? value.sourceName.slice(0, 120) : "Vocabulary list",
    inputHash: value.inputHash, generatedAt: value.generatedAt,
    recipe: {
      kind: "vocabulary_list", version: 1, vocabListId: recipe.vocabListId,
      format: recipe.format, selectedEntryIds: [...recipe.selectedEntryIds],
      settings: lessonVocabularySettings(recipe.format, recipe.selectedEntryIds.length),
    },
  };
}

export function lessonVocabularySettings(format: LessonVocabularyFormat, itemCount: number): NonNullable<VocabActivityGenerationRecipe["settings"]> {
  return format === "flashcards"
    ? { flashcardsFrontFaces: ["picture", "definition"], flashcardsBackFaces: ["word", "example"], flashcardsShuffleCards: false }
    : { mcStableItems: true, mcOptionCount: Math.min(4, itemCount), mcShuffleOptions: true, mcMasterQuestion: "Which word matches?" };
}

/** Strict selection prevents deleted words or incomplete inputs silently reducing coverage. */
export function selectLessonVocabularyEntries(list: VocabularyListDocument, ids: string[], format: LessonVocabularyFormat) {
  if (!LESSON_VOCABULARY_FORMATS.includes(format)) throw new Error("Choose flashcards or a vocabulary check.");
  if (!Array.isArray(ids) || !ids.length || ids.length > 500 || ids.some((id) => typeof id !== "string" || !id.trim()) || new Set(ids).size !== ids.length) {
    throw new Error("Select at least one word, without duplicate selections.");
  }
  const selected = new Set(ids);
  const entries = list.entries.filter((entry) => selected.has(entry.id));
  if (entries.length !== ids.length) throw new Error("Some selected words have changed or been removed. Reload the list and select again.");
  const incomplete = entries.filter((entry) => !entry.word.trim() ||
    (format === "multiple_choice" ? !entry.definitionEn?.trim() && !entry.imageUrl?.trim()
      : !entry.definitionEn?.trim() && !entry.example?.trim() && !entry.imageUrl?.trim()));
  if (incomplete.length) {
    throw new Error(`Add ${format === "multiple_choice" ? "a definition or picture" : "a definition, example, or picture"} for: ${incomplete.map((entry) => entry.word || "empty word").join(", ")}.`);
  }
  if (format === "multiple_choice") {
    if (entries.length < 2) throw new Error("A vocabulary check needs at least two words.");
    if (new Set(entries.map((entry) => entry.word.trim().toLowerCase())).size !== entries.length) throw new Error("A vocabulary check needs distinct words. Select one entry per word.");
    const definitions = entries.map((entry) => entry.definitionEn?.trim().toLowerCase()).filter(Boolean);
    if (new Set(definitions).size !== definitions.length) throw new Error("Some words have the same definition. Clarify their meanings before generating a check.");
  }
  return entries;
}

/** Canonical selected inputs; unrelated list rows do not affect freshness. */
export function lessonVocabularyInput(list: VocabularyListDocument, ids: string[], format: LessonVocabularyFormat): string {
  return JSON.stringify({ adapterVersion: 1, format, name: list.name, cefr: list.cefr ?? "", settings: lessonVocabularySettings(format, ids.length), entries: selectLessonVocabularyEntries(list, ids, format) });
}
