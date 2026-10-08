import { compileFlashcardsModule, compileMultipleChoiceModule } from "@/lib/activity-builder/games/compile-from-vocab-list";
import { exportGamesFlashcardsForLessonPlayer } from "@/lib/activity-builder/games/flashcards";
import { exportGamesMcQuizForLessonPlayer, validateGamesAuthoringDocument } from "@/lib/activity-builder/games/mc-quiz";
import type { VocabularyListDocument } from "@/lib/activity-builder/vocabulary-list/types";
import type { GamesAuthoringDocument } from "@/lib/activity-builder/games/types-mc";
import { lessonVocabularyInput, lessonVocabularySettings, selectLessonVocabularyEntries, type LessonVocabularyFormat } from "@/lib/class-lessons/vocabulary";

/** Thin adapters around the established compilers and exporters. No new runtime. */
export function compileLessonVocabularyMaterial(list: VocabularyListDocument, selectedEntryIds: string[], format: LessonVocabularyFormat) {
  const entries = selectLessonVocabularyEntries(list, selectedEntryIds, format);
  const settings = lessonVocabularySettings(format, entries.length);
  const input = { list, formats: [format], selectedEntryIds, ...settings };
  const inputText = lessonVocabularyInput(list, selectedEntryIds, format);
  if (format === "flashcards") {
    const compiled = compileFlashcardsModule(list, entries, input);
    if (compiled.skipped.length) throw new Error(compiled.skipped.map((row) => `${row.word}: ${row.reason}`).join(" "));
    const authoring = compiled.document as Parameters<typeof exportGamesFlashcardsForLessonPlayer>[0];
    return { authoring, pack: exportGamesFlashcardsForLessonPlayer(authoring), itemCount: entries.length, inputText, settings, selectedEntryIds: entries.map((entry) => entry.id) };
  }
  const compiled = compileMultipleChoiceModule(list, entries, input);
  const document = compiled.document as GamesAuthoringDocument;
  for (const item of document.interaction.items) {
    const entry = entries.find((row) => item.id === `mc-${row.id}`)!;
    item.question = entry.definitionEn?.trim()
      ? `Which word means: ${entry.definitionEn.trim()}`
      : "Which word matches this picture?";
    // A scored recognition check should not read its answer aloud.
    delete item.promptAudioUrl;
  }
  const authoring = validateGamesAuthoringDocument(document);
  return { authoring, pack: exportGamesMcQuizForLessonPlayer(authoring), itemCount: entries.length, inputText, settings, selectedEntryIds: entries.map((entry) => entry.id) };
}
