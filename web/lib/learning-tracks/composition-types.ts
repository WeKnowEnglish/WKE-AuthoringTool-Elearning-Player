import type { GamesFlashcardFace } from "@/lib/activity-builder/games/types-flashcards";
import type { CoreModuleId } from "@/lib/activity-builder/core-modules/types";

/** Lesson Player interaction screen payload (snake_case). Opaque to Studio validators. */
export type LearningTrackScreenPayload = {
  type: "interaction";
  subtype: string;
  [key: string]: unknown;
};

export type LearningTrackBeatKind =
  | "explore_hotspots"
  | "language_in_focus"
  | "flashcards"
  | "listen_and_choose"
  | "multiple_choice"
  | "letter_mixup"
  | "line_match"
  | "true_false"
  | "sentence_scramble"
  | "fill_blanks";

/** Beat kinds that should get a post-activity report bridge when `afterBridge` is auto. */
export const QUIZ_REPORT_BEAT_KINDS: readonly LearningTrackBeatKind[] = [
  "multiple_choice",
  "letter_mixup",
  "listen_and_choose",
  "line_match",
  "true_false",
  "sentence_scramble",
  "fill_blanks",
] as const;

export type LearningTrackFixtureId =
  | "hobbies-hotspots"
  | "hobbies-like-ing"
  | "hobbies-flashcards"
  | "hobbies-listen-choose";

/** Built-in hobbies vocabulary list (sync; no IndexedDB). */
export const HOBBIES_DEFAULT_VOCAB_LIST_ID = "hobbies-default";

export type LearningTrackVocabCompileFormat = CoreModuleId;

/** Library / Activity Bank formats that can feed a track beat today. */
export type LearningTrackLibraryFormat =
  | "multiple_choice"
  | "letter_mixup"
  | "flashcards"
  | "listen_and_choose"
  | "line_match"
  | "true_false"
  | "sentence_scramble"
  | "fill_blanks"
  | "explore_hotspots";

export type LearningTrackBeatSource =
  | { type: "fixture"; fixtureId: LearningTrackFixtureId }
  | {
      type: "vocab_compile";
      /** `hobbies-default` or an Activity Library vocabulary_list entry id. */
      listId: string;
      format: LearningTrackVocabCompileFormat;
    }
  | {
      type: "library";
      libraryId: string;
      format: LearningTrackLibraryFormat;
    };

/**
 * Bridge after a content beat. Compile emits a `post_quiz_report`
 * interaction screen (quiz report + encouragement + next-activity cue).
 */
export type LearningTrackAfterBridge =
  | "none"
  | "post_quiz_report"
  | "auto";

/** Pack-wide flashcards face layout (applies to every card from vocab compile). */
export type LearningTrackFlashcardsSettings = {
  frontFaces: GamesFlashcardFace[];
  backFaces: GamesFlashcardFace[];
  /** Shuffle card order when the activity starts. */
  shuffleCards: boolean;
};

/** Pack-wide multiple-choice settings (applies to every item from vocab compile). */
export type LearningTrackMultipleChoiceSettings = {
  masterQuestion: string;
  /** Total answer choices including the correct word (2–6). */
  optionCount: number;
  shuffleOptions: boolean;
  /**
   * When true, Lesson Player advances to the next screen after a correct answer.
   * Defaults to true for MCQ beats.
   */
  autoAdvanceOnPass: boolean;
  /**
   * Optional pack-wide prompt clip. Applied at compile when an item has no
   * per-word audio yet (Phase B shared clip control).
   */
  promptAudioUrl?: string;
  /**
   * Per-question polish after vocab compile (Phase C).
   * Keyed by compiled item id (`mc-{vocabEntryId}`).
   */
  itemOverlays?: LearningTrackMcItemOverlay[];
};

/** Per-item MCQ overrides — empty fields keep the compiled value. */
export type LearningTrackMcItemOverlay = {
  itemId: string;
  question?: string;
  /** Option label overrides keyed by option id (`a`–`f`). */
  optionLabels?: Record<string, string>;
  /** Which option is correct (`a`–`f`). Must match an option id. */
  correctOptionId?: string;
  promptAudioUrl?: string;
};

/** Pack-wide letter scramble settings (applies to every item from vocab compile). */
export type LearningTrackLetterMixupSettings = {
  prompt: string;
  shuffleLetters: boolean;
  caseSensitive: boolean;
  /**
   * When true, Lesson Player advances after a correct scramble.
   * Defaults to true for letter scramble beats.
   */
  autoAdvanceOnPass: boolean;
  /**
   * Optional pack-wide word clip. Applied at compile when an item has no
   * image audio yet (Phase B shared clip control).
   */
  imageAudioUrl?: string;
};

/** Per-item Listen & Choose overlays — keyed by quiz_group_order. */
export type LearningTrackListenItemOverlay = {
  itemIndex: number;
  /** Question prompt shown above the pictures (`body_text`). */
  bodyText?: string;
  promptAudioUrl?: string;
  autoPlay?: boolean;
};

/** Listen & Choose polish on fixture (or later library) screens — Phase D. */
export type LearningTrackListenAndChooseSettings = {
  itemOverlays?: LearningTrackListenItemOverlay[];
};

/** Per-turn Explore Hotspots audio — keyed by dialogue id + turn index (legacy Phase E). */
export type LearningTrackHotspotTurnOverlay = {
  dialogueId: string;
  turnIndex: number;
  audioUrl?: string;
};

/**
 * Modular content card shown when a hotspot is selected.
 * Start with dialogue turns; more `type` variants land later (image, tip, choice…).
 */
export type LearningTrackHotspotDialogueTurnCard = {
  id: string;
  type: "dialogue_turn";
  speaker: string;
  text: string;
  /** Optional TTS override when no audioUrl. */
  speakText?: string;
  audioUrl?: string;
};

export type LearningTrackHotspotContentCard = LearningTrackHotspotDialogueTurnCard;

/** Full staged panel for one dialogue / hotspot click response. */
export type LearningTrackHotspotPanelOverlay = {
  dialogueId: string;
  title?: string;
  cards: LearningTrackHotspotContentCard[];
};

/** Explore Hotspots click-content overlays — Phase E+. */
export type LearningTrackExploreHotspotsSettings = {
  /** Preferred: staged modular cards per dialogue. */
  panelOverlays?: LearningTrackHotspotPanelOverlay[];
  /**
   * Legacy audio-only stamps (Phase E). Still applied when no panel overlay
   * exists for that dialogue.
   */
  turnOverlays?: LearningTrackHotspotTurnOverlay[];
};

/** Per-example Language in Focus Listen audio — keyed by example id. */
export type LearningTrackLifExampleOverlay = {
  exampleId: string;
  audioUrl?: string;
};

/** Language in Focus listen-example audio overlays — Phase F. */
export type LearningTrackLanguageInFocusSettings = {
  exampleOverlays?: LearningTrackLifExampleOverlay[];
};

/** Pack-wide line match settings (vocab compile). */
export type LearningTrackLineMatchSettings = {
  bodyText: string;
  autoAdvanceOnPass: boolean;
};

/** Pack-wide true/false settings (vocab compile). */
export type LearningTrackTrueFalseSettings = {
  autoAdvanceOnPass: boolean;
};

/** Pack-wide sentence scramble settings (vocab compile). */
export type LearningTrackSentenceScrambleSettings = {
  bodyText: string;
  autoAdvanceOnPass: boolean;
};

/** Pack-wide fill-in-the-blanks settings (vocab compile). */
export type LearningTrackFillBlanksSettings = {
  bodyText: string;
  autoAdvanceOnPass: boolean;
};

export type LearningTrackBeatPresentation = {
  afterBridge?: LearningTrackAfterBridge;
  introTemplateId?: string;
  /** Flashcards activity settings (not per-card). */
  flashcards?: LearningTrackFlashcardsSettings;
  /** Multiple choice activity settings (not per-question). */
  multipleChoice?: LearningTrackMultipleChoiceSettings;
  /** Letter scramble activity settings (not per-item). */
  letterMixup?: LearningTrackLetterMixupSettings;
  /** Listen & Choose prompt audio / auto-play overlays. */
  listenAndChoose?: LearningTrackListenAndChooseSettings;
  /** Explore Hotspots dialogue turn audio overlays. */
  exploreHotspots?: LearningTrackExploreHotspotsSettings;
  /** Language in Focus listen-example audio overlays. */
  languageInFocus?: LearningTrackLanguageInFocusSettings;
  /** Line match activity settings. */
  lineMatch?: LearningTrackLineMatchSettings;
  /** True / false activity settings. */
  trueFalse?: LearningTrackTrueFalseSettings;
  /** Sentence scramble activity settings. */
  sentenceScramble?: LearningTrackSentenceScrambleSettings;
  /** Fill in the blanks activity settings. */
  fillBlanks?: LearningTrackFillBlanksSettings;
};

export type LearningTrackBeatInstance = {
  id: string;
  kind: LearningTrackBeatKind;
  /** Teacher-facing label; defaults from kind. */
  label?: string;
  source: LearningTrackBeatSource;
  presentation?: LearningTrackBeatPresentation;
};

/** Editable track composition (Phase A). Teachers reorder/add/remove beats. */
export type LearningTrackComposition = {
  version: 1;
  kind: "learning-track-composition";
  id: string;
  packId: string;
  packTitle: string;
  trackIndex: number;
  title: string;
  aim: string;
  durationTargetMin: number;
  cefr?: string;
  /**
   * Track-wide vocabulary list. New quiz-style beats inherit it as their
   * `vocab_compile` source; individual beats may still override.
   * Prefer a `studio_activities` UUID (`format=vocabulary_list`); `hobbies-default`
   * remains the built-in sync demo list.
   */
  vocabListId?: string;
  beats: LearningTrackBeatInstance[];
};

/** @deprecated Prefer LearningTrackComposition. Kept for starter recipe lists. */
export type LearningTrackRecipe = {
  id: string;
  packId: string;
  packTitle: string;
  trackIndex: number;
  title: string;
  aim: string;
  durationTargetMin: number;
  cefr?: string;
  beats: LearningTrackBeatKind[];
};

export type LearningTrackPlannedBridge = {
  kind: "post_quiz_report";
  status: "planned" | "emitted";
  nextBeatId?: string;
  nextBeatLabel?: string;
  /** Index of the generated bridge screen in pack.screens. */
  screenIndex?: number;
  /** Copy intent for the bridge author/generator. */
  intent: string;
};

export type LearningTrackBeatPlan = {
  id: string;
  kind: LearningTrackBeatKind;
  label: string;
  /** Rough learner minutes for Studio duration budgeting. */
  estimatedMinutes: number;
  screenCount: number;
  /** Inclusive start index into pack.screens */
  screenStart: number;
  /** Exclusive end index into pack.screens */
  screenEnd: number;
  /** Generated bridge after this beat. */
  afterBridge?: LearningTrackPlannedBridge;
};

/** Compiled pack ready for Lesson Player. */
export type LearningTrackLessonPlayerPack = {
  version: 1;
  kind: "lessonplayer-track-pack";
  id: string;
  pack_id: string;
  pack_title: string;
  track_index: number;
  title: string;
  aim: string;
  duration_target_min: number;
  estimated_minutes: number;
  cefr?: string;
  beat_plan: LearningTrackBeatPlan[];
  screens: LearningTrackScreenPayload[];
};

export type CompileLearningTrackResult = {
  pack: LearningTrackLessonPlayerPack;
  beatPlan: LearningTrackBeatPlan[];
  composition: LearningTrackComposition;
};

export const LEARNING_TRACK_BEAT_LABELS: Record<LearningTrackBeatKind, string> = {
  explore_hotspots: "Explore hotspots",
  language_in_focus: "Language in Focus",
  flashcards: "Flashcards",
  listen_and_choose: "Listen and choose",
  multiple_choice: "Multiple choice",
  letter_mixup: "Letter scramble",
  line_match: "Line match",
  true_false: "True / false",
  sentence_scramble: "Sentence scramble",
  fill_blanks: "Fill in the blanks",
};

export const LEARNING_TRACK_BEAT_KIND_OPTIONS: LearningTrackBeatKind[] = [
  "explore_hotspots",
  "flashcards",
  "language_in_focus",
  "listen_and_choose",
  "multiple_choice",
  "letter_mixup",
  "line_match",
  "true_false",
  "sentence_scramble",
  "fill_blanks",
];
