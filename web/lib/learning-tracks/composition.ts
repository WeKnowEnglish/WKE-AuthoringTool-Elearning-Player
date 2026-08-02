import type { GamesFlashcardFace } from "@/lib/activity-builder/games/types-flashcards";
import {
  HOBBIES_DEFAULT_VOCAB_LIST_ID,
  LEARNING_TRACK_BEAT_LABELS,
  QUIZ_REPORT_BEAT_KINDS,
  type LearningTrackAfterBridge,
  type LearningTrackBeatInstance,
  type LearningTrackBeatKind,
  type LearningTrackBeatSource,
  type LearningTrackComposition,
  type LearningTrackFixtureId,
  type LearningTrackFlashcardsSettings,
  type LearningTrackLetterMixupSettings,
  type LearningTrackListenAndChooseSettings,
  type LearningTrackExploreHotspotsSettings,
  type LearningTrackLanguageInFocusSettings,
  type LearningTrackMultipleChoiceSettings,
  type LearningTrackLineMatchSettings,
  type LearningTrackTrueFalseSettings,
  type LearningTrackSentenceScrambleSettings,
  type LearningTrackFillBlanksSettings,
  type LearningTrackPlannedBridge,
  type LearningTrackRecipe,
  type LearningTrackVocabCompileFormat,
} from "@/lib/learning-tracks/composition-types";

/** Default: picture on front; word + example on back. */
export const DEFAULT_FLASHCARDS_FRONT_FACES: GamesFlashcardFace[] = ["picture"];
export const DEFAULT_FLASHCARDS_BACK_FACES: GamesFlashcardFace[] = ["word", "example"];

export const DEFAULT_MC_MASTER_QUESTION = "What is this?";
export const DEFAULT_MC_OPTION_COUNT = 4;
export const DEFAULT_LETTER_MIXUP_PROMPT =
  "Unscramble the letters to spell the word.";
export const DEFAULT_LINE_MATCH_BODY =
  "Draw a line from each word to its picture.";
export const DEFAULT_SENTENCE_SCRAMBLE_BODY = "Put the words in order.";
export const DEFAULT_FILL_BLANKS_BODY = "Choose the missing word.";

export function defaultFlashcardsSettings(): LearningTrackFlashcardsSettings {
  return {
    frontFaces: [...DEFAULT_FLASHCARDS_FRONT_FACES],
    backFaces: [...DEFAULT_FLASHCARDS_BACK_FACES],
    shuffleCards: true,
  };
}

export function defaultMultipleChoiceSettings(): LearningTrackMultipleChoiceSettings {
  return {
    masterQuestion: DEFAULT_MC_MASTER_QUESTION,
    optionCount: DEFAULT_MC_OPTION_COUNT,
    shuffleOptions: true,
    autoAdvanceOnPass: true,
  };
}

export function defaultLetterMixupSettings(): LearningTrackLetterMixupSettings {
  return {
    prompt: DEFAULT_LETTER_MIXUP_PROMPT,
    shuffleLetters: true,
    caseSensitive: false,
    autoAdvanceOnPass: true,
  };
}

export function defaultListenAndChooseSettings(): LearningTrackListenAndChooseSettings {
  return {};
}

export function defaultExploreHotspotsSettings(): LearningTrackExploreHotspotsSettings {
  return {};
}

export function defaultLanguageInFocusSettings(): LearningTrackLanguageInFocusSettings {
  return {};
}

export function defaultLineMatchSettings(): LearningTrackLineMatchSettings {
  return {
    bodyText: DEFAULT_LINE_MATCH_BODY,
    autoAdvanceOnPass: true,
  };
}

export function defaultTrueFalseSettings(): LearningTrackTrueFalseSettings {
  return {
    autoAdvanceOnPass: true,
  };
}

export function defaultSentenceScrambleSettings(): LearningTrackSentenceScrambleSettings {
  return {
    bodyText: DEFAULT_SENTENCE_SCRAMBLE_BODY,
    autoAdvanceOnPass: true,
  };
}

export function defaultFillBlanksSettings(): LearningTrackFillBlanksSettings {
  return {
    bodyText: DEFAULT_FILL_BLANKS_BODY,
    autoAdvanceOnPass: true,
  };
}

export function clampMcOptionCount(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_MC_OPTION_COUNT;
  return Math.min(6, Math.max(2, Math.round(value)));
}

function newBeatId(kind: LearningTrackBeatKind): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `beat-${kind}-${crypto.randomUUID().slice(0, 8)}`;
  }
  return `beat-${kind}-${Date.now().toString(36)}`;
}

/** Beat kinds that can be procedurally generated from a vocabulary list. */
export function vocabFormatForKind(
  kind: LearningTrackBeatKind,
): LearningTrackVocabCompileFormat | null {
  if (
    kind === "multiple_choice" ||
    kind === "letter_mixup" ||
    kind === "flashcards" ||
    kind === "listen_and_choose" ||
    kind === "line_match" ||
    kind === "true_false" ||
    kind === "sentence_scramble" ||
    kind === "fill_blanks"
  ) {
    return kind;
  }
  return null;
}

/**
 * Default source for a new beat. When the track carries a vocabulary list,
 * every beat that can be procedurally generated from vocabulary inherits it.
 */
export function defaultSourceForKind(
  kind: LearningTrackBeatKind,
  trackVocabListId?: string,
): LearningTrackBeatSource {
  const vocabFormat = vocabFormatForKind(kind);
  if (vocabFormat && trackVocabListId) {
    return { type: "vocab_compile", listId: trackVocabListId, format: vocabFormat };
  }

  switch (kind) {
    case "explore_hotspots":
      return { type: "fixture", fixtureId: "hobbies-hotspots" };
    case "language_in_focus":
      return { type: "fixture", fixtureId: "hobbies-like-ing" };
    case "flashcards":
      return { type: "fixture", fixtureId: "hobbies-flashcards" };
    case "listen_and_choose":
      return { type: "fixture", fixtureId: "hobbies-listen-choose" };
    case "multiple_choice":
      return {
        type: "vocab_compile",
        listId: HOBBIES_DEFAULT_VOCAB_LIST_ID,
        format: "multiple_choice",
      };
    case "letter_mixup":
      return {
        type: "vocab_compile",
        listId: HOBBIES_DEFAULT_VOCAB_LIST_ID,
        format: "letter_mixup",
      };
    case "line_match":
      return {
        type: "vocab_compile",
        listId: HOBBIES_DEFAULT_VOCAB_LIST_ID,
        format: "line_match",
      };
    case "true_false":
      return {
        type: "vocab_compile",
        listId: HOBBIES_DEFAULT_VOCAB_LIST_ID,
        format: "true_false",
      };
    case "sentence_scramble":
      return {
        type: "vocab_compile",
        listId: HOBBIES_DEFAULT_VOCAB_LIST_ID,
        format: "sentence_scramble",
      };
    case "fill_blanks":
      return {
        type: "vocab_compile",
        listId: HOBBIES_DEFAULT_VOCAB_LIST_ID,
        format: "fill_blanks",
      };
    default: {
      const _exhaustive: never = kind;
      throw new Error(`Unsupported beat kind: ${_exhaustive}`);
    }
  }
}

export function defaultAfterBridgeForKind(kind: LearningTrackBeatKind): LearningTrackAfterBridge {
  return QUIZ_REPORT_BEAT_KINDS.includes(kind) ? "auto" : "none";
}

export function createBeatInstance(
  kind: LearningTrackBeatKind,
  overrides?: Partial<LearningTrackBeatInstance>,
  trackVocabListId?: string,
): LearningTrackBeatInstance {
  const flashcards =
    overrides?.presentation?.flashcards ??
    (kind === "flashcards" ? defaultFlashcardsSettings() : undefined);
  const multipleChoice =
    overrides?.presentation?.multipleChoice ??
    (kind === "multiple_choice" ? defaultMultipleChoiceSettings() : undefined);
  const letterMixup =
    overrides?.presentation?.letterMixup ??
    (kind === "letter_mixup" ? defaultLetterMixupSettings() : undefined);
  const listenAndChoose =
    overrides?.presentation?.listenAndChoose ??
    (kind === "listen_and_choose" ? defaultListenAndChooseSettings() : undefined);
  const exploreHotspots =
    overrides?.presentation?.exploreHotspots ??
    (kind === "explore_hotspots" ? defaultExploreHotspotsSettings() : undefined);
  const languageInFocus =
    overrides?.presentation?.languageInFocus ??
    (kind === "language_in_focus" ? defaultLanguageInFocusSettings() : undefined);
  const lineMatch =
    overrides?.presentation?.lineMatch ??
    (kind === "line_match" ? defaultLineMatchSettings() : undefined);
  const trueFalse =
    overrides?.presentation?.trueFalse ??
    (kind === "true_false" ? defaultTrueFalseSettings() : undefined);
  const sentenceScramble =
    overrides?.presentation?.sentenceScramble ??
    (kind === "sentence_scramble" ? defaultSentenceScrambleSettings() : undefined);
  const fillBlanks =
    overrides?.presentation?.fillBlanks ??
    (kind === "fill_blanks" ? defaultFillBlanksSettings() : undefined);
  return {
    id: overrides?.id ?? newBeatId(kind),
    kind,
    label: overrides?.label ?? LEARNING_TRACK_BEAT_LABELS[kind],
    source: overrides?.source ?? defaultSourceForKind(kind, trackVocabListId),
    presentation: {
      afterBridge:
        overrides?.presentation?.afterBridge ?? defaultAfterBridgeForKind(kind),
      ...(overrides?.presentation?.introTemplateId
        ? { introTemplateId: overrides.presentation.introTemplateId }
        : {}),
      ...(flashcards ? { flashcards } : {}),
      ...(multipleChoice ? { multipleChoice } : {}),
      ...(letterMixup ? { letterMixup } : {}),
      ...(listenAndChoose ? { listenAndChoose } : {}),
      ...(exploreHotspots ? { exploreHotspots } : {}),
      ...(languageInFocus ? { languageInFocus } : {}),
      ...(lineMatch ? { lineMatch } : {}),
      ...(trueFalse ? { trueFalse } : {}),
      ...(sentenceScramble ? { sentenceScramble } : {}),
      ...(fillBlanks ? { fillBlanks } : {}),
    },
  };
}

/** Expand a legacy kind-only recipe into an editable composition. */
export function compositionFromRecipe(recipe: LearningTrackRecipe): LearningTrackComposition {
  return {
    version: 1,
    kind: "learning-track-composition",
    id: recipe.id,
    packId: recipe.packId,
    packTitle: recipe.packTitle,
    trackIndex: recipe.trackIndex,
    title: recipe.title,
    aim: recipe.aim,
    durationTargetMin: recipe.durationTargetMin,
    ...(recipe.cefr ? { cefr: recipe.cefr } : {}),
    beats: recipe.beats.map((kind, index) =>
      createBeatInstance(kind, { id: `${recipe.id}-beat-${index + 1}` }),
    ),
  };
}

export function resolveAfterBridgePlan(
  beat: LearningTrackBeatInstance,
  nextBeat: LearningTrackBeatInstance | undefined,
): LearningTrackPlannedBridge | undefined {
  const mode = beat.presentation?.afterBridge ?? defaultAfterBridgeForKind(beat.kind);
  if (mode === "none") return undefined;

  const wantsReport =
    mode === "post_quiz_report" ||
    (mode === "auto" && QUIZ_REPORT_BEAT_KINDS.includes(beat.kind));

  if (!wantsReport) return undefined;
  if (!nextBeat) return undefined;

  const nextLabel = nextBeat.label ?? LEARNING_TRACK_BEAT_LABELS[nextBeat.kind];
  return {
    kind: "post_quiz_report",
    status: "planned",
    nextBeatId: nextBeat.id,
    nextBeatLabel: nextLabel,
    intent:
      `Show a brief quiz report with encouragement, then cue the next activity (“${nextLabel}”).`,
  };
}

export function isLearningTrackComposition(value: unknown): value is LearningTrackComposition {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { kind?: unknown }).kind === "learning-track-composition" &&
    (value as { version?: unknown }).version === 1
  );
}

export function fixtureIdForKind(kind: LearningTrackBeatKind): LearningTrackFixtureId | null {
  const source = defaultSourceForKind(kind);
  return source.type === "fixture" ? source.fixtureId : null;
}
