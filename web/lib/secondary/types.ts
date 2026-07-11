export type SecondaryPartOfSpeech = "noun" | "verb" | "adjective" | "adverb" | "phrase";

export type SecondaryCefrLevel = "A1" | "A2" | "B1";

export type SecondaryDifficulty = 1 | 2 | 3 | 4 | 5;

export type SecondarySpellingSupport = {
  syllables: string[];
  commonMistakes: string[];
};

export type SecondaryExamplePurpose = "introductory" | "transfer" | "dialogue" | "contrast";

export type SecondaryVocabExample = {
  id: string;
  text: string;
  purpose: SecondaryExamplePurpose;
  /** Short author-facing context label, for example `school project`. */
  context?: string;
  difficulty?: SecondaryDifficulty;
};

export type SecondaryUsagePattern = {
  id: string;
  pattern: string;
  example: string;
  note?: string;
};

export type SecondaryProductionPrompt = {
  id: string;
  prompt: string;
  sentenceStarter?: string;
  modelAnswer: string;
};

export type SecondaryClozeContext = {
  id: string;
  text: string;
  /** Accepted surface forms; the first entry is the preferred display answer. */
  acceptableAnswers: string[];
  difficulty: SecondaryDifficulty;
  clueType?: "meaning" | "collocation" | "grammar" | "discourse";
};

export type SecondaryWordConfusion = {
  word: string;
  distinction: string;
  contrastExample: string;
};

export interface SecondaryVocabItem {
  wordItemId: string;
  packId: string;
  topicId: string;
  setId: string;
  word: string;
  lemma: string;
  partOfSpeech: SecondaryPartOfSpeech;
  cefrLevel: SecondaryCefrLevel;
  gradeBand: string;
  studentMeaningEn: string;
  vnMeaning: string;
  exampleSentence: string;
  difficulty: SecondaryDifficulty;
  practiceTypes: string[];
  tags: string[];
  commonChunks?: string[];
  relatedWords?: string[];
  opposites?: string[];
  distractors?: string[];
  sentenceFrame?: string;
  spellingSupport?: SecondarySpellingSupport;
  /** Phase 2 rich-language fields. Optional until the versioned pack migration is complete. */
  examples?: SecondaryVocabExample[];
  usagePatterns?: SecondaryUsagePattern[];
  productionPrompts?: SecondaryProductionPrompt[];
  clozeContexts?: SecondaryClozeContext[];
  confusions?: SecondaryWordConfusion[];
  usageNote?: string;
  /** Curated illustration URL when available. */
  imageUrl?: string;
  /** Optional lookup key for `media_assets` resolution. */
  mediaHint?: string;
}

export interface SecondaryVocabSet {
  setId: string;
  title: string;
  description?: string;
  practiceFocus: string[];
  items: SecondaryVocabItem[];
}

export interface SecondaryVocabTopic {
  topicId: string;
  title: string;
  description?: string;
  sets: SecondaryVocabSet[];
}

export interface SecondaryVocabPackMetadata {
  packId: string;
  title: string;
  description: string;
  cefrLevel: SecondaryCefrLevel;
  gradeBand: string;
  version: string;
}

export interface SecondaryVocabPack {
  metadata: SecondaryVocabPackMetadata;
  topics: SecondaryVocabTopic[];
}

export interface SecondaryClozeTemplate {
  id: string;
  title: string;
  paragraph: string;
  blankWordItemIds: string[];
  distractorWords: string[];
  fillerWordItemIds?: string[];
  compilerVersion?: 2 | 3;
  topicId?: string;
  topicTitle?: string;
  replayIndex?: number;
}

export type WordMasteryLevel = 0 | 1 | 2 | 3 | 4 | 5;

export interface SecondaryWordProgressRecord {
  wordItemId: string;
  masteryLevel: WordMasteryLevel;
  timesSeen: number;
  timesCorrect: number;
  correctStreak: number;
  recentAccuracy: number;
  lastPracticedAt?: string;
  nextReviewAt?: string;
}

export type SecondaryTodayActivityKey = "match" | "cloze" | "spelling" | "sentence";

export type SecondaryAttemptActivityType = Exclude<SecondaryTodayActivityKey, "sentence"> | "learn";

export interface SecondaryWordAttempt {
  activityType: SecondaryAttemptActivityType;
  wordItemId: string;
  isCorrect: boolean;
  attemptedAt: string;
}

export interface SecondaryTodaySession {
  dateKey: string;
  warmUpWordItemIds: string[];
  todayWordItemIds: string[];
  allWordItemIds: string[];
  /** Present on sessions built by selection v2 (S1b+). */
  selectionVersion?: 2 | 3;
  /** Today-list words in FIFO order they crossed mastered while on this session. */
  masteredOnListOrder?: string[];
  /** Words evicted from today's list via slow replace (audit / exclude from re-picks). */
  replacedOutWordItemIds?: string[];
  /** Vocab pack used when this session was built (invalidates on pack bump). */
  packId?: string;
  packVersion?: string;
  /** Snapshot of today's 10 at first build — used for "new today" labels after slow-replace. */
  initialTodayWordItemIds?: string[];
  /** Words swapped onto today's list via slow-replace during this session day. */
  introducedWordItemIds?: string[];
  /** Why each today word was selected (S2 diagnostics / UI badges). */
  selectionReasons?: Record<string, string>;
}

export interface SecondaryTodayActivityCompletion {
  completed: true;
  percent: number;
  completedAt: string;
}

export type SecondaryTodayCompletion = Partial<
  Record<SecondaryTodayActivityKey, SecondaryTodayActivityCompletion>
>;
