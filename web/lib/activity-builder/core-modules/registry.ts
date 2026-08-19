import type { GamesAuthoringDocument } from "@/lib/activity-builder/games/types-mc";
import type { GamesLetterMixupAuthoringDocument } from "@/lib/activity-builder/games/types-letter-mixup";
import type { GamesFlashcardsAuthoringDocument } from "@/lib/activity-builder/games/types-flashcards";
import type { GamesListenAndChooseAuthoringDocument } from "@/lib/activity-builder/games/types-listen-and-choose";
import type { GamesLineMatchAuthoringDocument } from "@/lib/activity-builder/games/types-line-match";
import type { GamesTrueFalseAuthoringDocument } from "@/lib/activity-builder/games/types-true-false";
import type { GamesSentenceScrambleAuthoringDocument } from "@/lib/activity-builder/games/types-sentence-scramble";
import type { GamesFillBlanksAuthoringDocument } from "@/lib/activity-builder/games/types-fill-blanks";
import type { GamesWordGameAuthoringDocument } from "@/lib/activity-builder/games/types-word-games";
import type {
  VocabListEntry,
  VocabularyListDocument,
} from "@/lib/activity-builder/vocabulary-list/types";
import type {
  CompileQuizzesFromVocabListInput,
  VocabCompileResult,
  VocabCompileSkipped,
} from "@/lib/activity-builder/games/compile-from-vocab-list";
import {
  compileFillBlanksModule,
  compileFlashcardsModule,
  compileLetterMixupModule,
  compileLineMatchModule,
  compileListenAndChooseModule,
  compileMultipleChoiceModule,
  compileSentenceScrambleModule,
  compileTrueFalseModule,
  compileWordSearchModule,
  compileCrosswordModule,
  compileMemoryModule,
  resolveVocabCompileEntries,
} from "@/lib/activity-builder/games/compile-from-vocab-list";
import { exportGamesFlashcardsForLessonPlayer } from "@/lib/activity-builder/games/flashcards";
import { exportGamesLetterMixupForLessonPlayer } from "@/lib/activity-builder/games/letter-mixup";
import { exportGamesMcQuizForLessonPlayer } from "@/lib/activity-builder/games/mc-quiz";
import { exportGamesListenAndChooseForLessonPlayer } from "@/lib/activity-builder/games/listen-and-choose";
import { exportGamesLineMatchForLessonPlayer } from "@/lib/activity-builder/games/line-match";
import { exportGamesTrueFalseForLessonPlayer } from "@/lib/activity-builder/games/true-false";
import { exportGamesSentenceScrambleForLessonPlayer } from "@/lib/activity-builder/games/sentence-scramble";
import { exportGamesFillBlanksForLessonPlayer } from "@/lib/activity-builder/games/fill-blanks";
import { exportGamesWordGameForLessonPlayer } from "@/lib/activity-builder/games/word-games";
import {
  CORE_MODULE_IDS,
  CORE_MODULE_META,
  type CoreModuleId,
  type CoreModuleMeta,
  getCoreModuleMeta,
  isCoreModuleId,
} from "@/lib/activity-builder/core-modules/types";

export type CoreModuleAuthoringDocument =
  | GamesAuthoringDocument
  | GamesLetterMixupAuthoringDocument
  | GamesFlashcardsAuthoringDocument
  | GamesListenAndChooseAuthoringDocument
  | GamesLineMatchAuthoringDocument
  | GamesTrueFalseAuthoringDocument
  | GamesSentenceScrambleAuthoringDocument
  | GamesFillBlanksAuthoringDocument
  | GamesWordGameAuthoringDocument;

export type CoreModuleCompileBundle = {
  document: CoreModuleAuthoringDocument;
  skipped: VocabCompileSkipped[];
  itemCount: number;
};

export type CoreModuleDefinition = {
  meta: CoreModuleMeta;
  compile: (
    list: VocabularyListDocument,
    entries: VocabListEntry[],
    input: CompileQuizzesFromVocabListInput,
  ) => CoreModuleCompileBundle;
  exportToLessonPlayer: (document: CoreModuleAuthoringDocument) => unknown;
};

const CORE_MODULES: Record<CoreModuleId, CoreModuleDefinition> = {
  multiple_choice: {
    meta: CORE_MODULE_META.multiple_choice,
    compile: compileMultipleChoiceModule,
    exportToLessonPlayer: (document) =>
      exportGamesMcQuizForLessonPlayer(document as GamesAuthoringDocument),
  },
  letter_mixup: {
    meta: CORE_MODULE_META.letter_mixup,
    compile: compileLetterMixupModule,
    exportToLessonPlayer: (document) =>
      exportGamesLetterMixupForLessonPlayer(
        document as GamesLetterMixupAuthoringDocument,
      ),
  },
  flashcards: {
    meta: CORE_MODULE_META.flashcards,
    compile: compileFlashcardsModule,
    exportToLessonPlayer: (document) =>
      exportGamesFlashcardsForLessonPlayer(
        document as GamesFlashcardsAuthoringDocument,
      ),
  },
  listen_and_choose: {
    meta: CORE_MODULE_META.listen_and_choose,
    compile: compileListenAndChooseModule,
    exportToLessonPlayer: (document) =>
      exportGamesListenAndChooseForLessonPlayer(
        document as GamesListenAndChooseAuthoringDocument,
      ),
  },
  line_match: {
    meta: CORE_MODULE_META.line_match,
    compile: compileLineMatchModule,
    exportToLessonPlayer: (document) =>
      exportGamesLineMatchForLessonPlayer(
        document as GamesLineMatchAuthoringDocument,
      ),
  },
  true_false: {
    meta: CORE_MODULE_META.true_false,
    compile: compileTrueFalseModule,
    exportToLessonPlayer: (document) =>
      exportGamesTrueFalseForLessonPlayer(
        document as GamesTrueFalseAuthoringDocument,
      ),
  },
  sentence_scramble: {
    meta: CORE_MODULE_META.sentence_scramble,
    compile: compileSentenceScrambleModule,
    exportToLessonPlayer: (document) =>
      exportGamesSentenceScrambleForLessonPlayer(
        document as GamesSentenceScrambleAuthoringDocument,
      ),
  },
  fill_blanks: {
    meta: CORE_MODULE_META.fill_blanks,
    compile: compileFillBlanksModule,
    exportToLessonPlayer: (document) =>
      exportGamesFillBlanksForLessonPlayer(
        document as GamesFillBlanksAuthoringDocument,
      ),
  },
  wordsearch: {
    meta: CORE_MODULE_META.wordsearch,
    compile: compileWordSearchModule,
    exportToLessonPlayer: (document) =>
      exportGamesWordGameForLessonPlayer(document as GamesWordGameAuthoringDocument),
  },
  crossword: {
    meta: CORE_MODULE_META.crossword,
    compile: compileCrosswordModule,
    exportToLessonPlayer: (document) =>
      exportGamesWordGameForLessonPlayer(document as GamesWordGameAuthoringDocument),
  },
  memory: {
    meta: CORE_MODULE_META.memory,
    compile: compileMemoryModule,
    exportToLessonPlayer: (document) =>
      exportGamesWordGameForLessonPlayer(document as GamesWordGameAuthoringDocument),
  },
};

export function listCoreModules(): CoreModuleDefinition[] {
  return CORE_MODULE_IDS.map((id) => CORE_MODULES[id]);
}

export function getCoreModule(id: CoreModuleId): CoreModuleDefinition {
  return CORE_MODULES[id];
}

/**
 * Compile one core module from a vocab list (selected entries or all).
 * Shared entry point for Quiz Builder and Learning Track `vocab_compile`.
 */
export function compileCoreModule(
  id: CoreModuleId,
  input: CompileQuizzesFromVocabListInput,
): VocabCompileResult {
  const entries = resolveVocabCompileEntries(input.list, input.selectedEntryIds);
  if (entries.length < 1) {
    throw new Error("Select at least one vocabulary word.");
  }
  const module = getCoreModule(id);
  const compiled = module.compile(input.list, entries, input);
  return {
    format: id,
    href: module.meta.href,
    label: module.meta.title,
    itemCount: compiled.itemCount,
    document: compiled.document,
  };
}

/** Export an authoring document to a Lesson Player games pack. */
export function exportCoreModuleToLessonPlayer(
  id: CoreModuleId,
  document: CoreModuleAuthoringDocument,
): unknown {
  return getCoreModule(id).exportToLessonPlayer(document);
}

export {
  CORE_MODULE_IDS,
  CORE_MODULE_META,
  getCoreModuleMeta,
  isCoreModuleId,
};
export type { CoreModuleId, CoreModuleMeta };
