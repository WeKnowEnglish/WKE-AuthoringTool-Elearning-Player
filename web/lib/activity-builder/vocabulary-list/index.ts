export type {
  VocabListEntry,
  VocabularyListDocument,
} from "@/lib/activity-builder/vocabulary-list/types";
export {
  createBakeryVocabularyListDocument,
  createBlankVocabularyListDocument,
  downloadTextFile,
  pickVocabularyListFile,
  saveVocabularyListToDisk,
  suggestedVocabularyListFilename,
  validateVocabularyListDocument,
  type VocabularyListFileResult,
} from "@/lib/activity-builder/vocabulary-list/document";
export {
  addVocabEntry,
  addVocabEntryFromFields,
  patchVocabEntry,
  removeVocabEntry,
  renameVocabularyList,
  type AddVocabFromLexiconResult,
} from "@/lib/activity-builder/vocabulary-list/editorOps";
export {
  normalizeVocabLemma,
  vocabListFieldsFromLexiconId,
} from "@/lib/activity-builder/vocabulary-list/from-lexicon";
export {
  compressGamesChoiceImageFile,
  formatBytes,
} from "@/lib/activity-builder/vocabulary-list/compressImage";
export {
  countLocalVocabMedia,
  dataUrlToBlob,
  publishLocalVocabMedia,
  publishVocabStudioAsset,
  readAudioFileAsDataUrl,
} from "@/lib/activity-builder/vocabulary-list/publishMedia";
