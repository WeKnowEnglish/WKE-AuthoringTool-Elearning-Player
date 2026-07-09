export type SecondaryPartOfSpeech = "noun" | "verb" | "adjective" | "adverb" | "phrase";

export type SecondaryCefrLevel = "A1" | "A2" | "B1";

export type SecondaryDifficulty = 1 | 2 | 3 | 4 | 5;

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

export interface SecondaryWordAttempt {
  activityType: "match" | "cloze" | "spelling";
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
}

export type SecondaryTodayActivityKey = "match" | "cloze" | "spelling";

export interface SecondaryTodayActivityCompletion {
  completed: true;
  percent: number;
  completedAt: string;
}

export type SecondaryTodayCompletion = Partial<
  Record<SecondaryTodayActivityKey, SecondaryTodayActivityCompletion>
>;
