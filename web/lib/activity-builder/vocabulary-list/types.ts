/** Studio vocabulary list — shared curriculum rows for quiz compile. */

export type VocabListEntry = {
  id: string;
  word: string;
  definitionEn?: string;
  example?: string;
  notes?: string;
  /** Picture for quizzes / flashcards (URL or data URL). */
  imageUrl?: string;
  imageFit?: "cover" | "contain";
  /** Recorded or uploaded word / prompt audio (URL or data URL). */
  audioUrl?: string;
  /** Recorded or uploaded example-sentence audio (URL or data URL). */
  exampleAudioUrl?: string;
  /** Recorded or uploaded definition audio (URL or data URL). */
  definitionAudioUrl?: string;
  /**
   * Optional lexicon provenance (`pv_*` / `tw_*` / primary candidate id).
   * Free-text fields remain the compile source of truth; this id supports
   * dedupe and pack→list migration.
   */
  sourceWordId?: string;
};

export type VocabularyListDocument = {
  version: 1;
  kind: "vocabulary-list";
  id: string;
  name: string;
  cefr?: string;
  entries: VocabListEntry[];
};
