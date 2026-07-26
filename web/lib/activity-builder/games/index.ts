export type { GamesAuthoringDocument, GamesMcItem } from "@/lib/activity-builder/games/types-mc";
export type {
  GamesLetterMixupAuthoringDocument,
  GamesLetterMixupItem,
} from "@/lib/activity-builder/games/types-letter-mixup";
export type {
  GamesFlashcardsAuthoringDocument,
} from "@/lib/activity-builder/games/types-flashcards";
export { makeMcOptions } from "@/lib/activity-builder/games/mc-options";
export { pickDistractors } from "@/lib/activity-builder/games/pick-distractors";
export { compileFlashcardsFromEntries } from "@/lib/activity-builder/games/compile-flashcards-from-entries";
export {
  compileQuizzesFromVocabList,
  type CompileQuizzesFromVocabListInput,
  type VocabCompileFormat,
  type VocabCompileOutput,
} from "@/lib/activity-builder/games/compile-from-vocab-list";
export {
  exportGamesMcQuizForLessonPlayer,
  validateGamesAuthoringDocument,
} from "@/lib/activity-builder/games/mc-quiz";
export {
  exportGamesLetterMixupForLessonPlayer,
  validateGamesLetterMixupAuthoringDocument,
} from "@/lib/activity-builder/games/letter-mixup";
export {
  exportGamesFlashcardsForLessonPlayer,
  validateGamesFlashcardsAuthoringDocument,
} from "@/lib/activity-builder/games/flashcards";
