import type { VocabCompileFormat } from "@/lib/activity-builder/games/compile-from-vocab-list";
import type { GamesFlashcardFace } from "@/lib/activity-builder/games/types-flashcards";
import type {
  GamesCrosswordClueMode,
  GamesMemoryTextMode,
} from "@/lib/activity-builder/games/types-word-games";
import { formatLabel } from "@/lib/activity-builder/games/quiz-builder-session";
import {
  ACTIVITY_TRACK_DOCUMENT_VERSION,
  type ActivityTrackDocument,
} from "@/lib/activity-tracks/types";
import {
  createBeatInstance,
  LEARNING_TRACK_BEAT_LABELS,
} from "@/lib/learning-tracks/composer";
import type {
  LearningTrackBeatInstance,
  LearningTrackBeatKind,
  LearningTrackComposition,
} from "@/lib/learning-tracks/composition-types";

/** Minimal card shape for Quiz Builder → practice track (avoids UI imports). */
export type QuizBuilderTrackCard = {
  format: VocabCompileFormat;
  source: "vocab_list" | "blank";
  listId: string | null;
  listName: string | null;
  selectedEntryIds: string[];
  masterPrompt: string;
  mcOptionCount: number;
  mcShuffleOptions: boolean;
  letterShuffleLetters: boolean;
  letterCaseSensitive: boolean;
  flashcardsShuffleCards: boolean;
  flashcardsFrontFaces: GamesFlashcardFace[];
  flashcardsBackFaces: GamesFlashcardFace[];
  wordSearchAllowBackwards: boolean;
  wordSearchAllowDiagonals: boolean;
  wordSearchAllowBackwardsDiagonals: boolean;
  memoryTextMode: GamesMemoryTextMode;
  crosswordClueMode: GamesCrosswordClueMode;
};

function estimatedMinutesForKind(kind: LearningTrackBeatKind): number {
  if (kind === "flashcards") return 2;
  if (kind === "listen_and_choose") return 2.5;
  if (kind === "multiple_choice") return 2;
  return 1.5;
}

function presentationForCard(
  card: QuizBuilderTrackCard,
): LearningTrackBeatInstance["presentation"] {
  const format = card.format;
  if (format === "multiple_choice") {
    return {
      afterBridge: "auto",
      multipleChoice: {
        masterQuestion: card.masterPrompt.trim() || "What is this?",
        optionCount: card.mcOptionCount,
        shuffleOptions: card.mcShuffleOptions,
        autoAdvanceOnPass: true,
      },
    };
  }
  if (format === "letter_mixup") {
    return {
      afterBridge: "auto",
      letterMixup: {
        prompt:
          card.masterPrompt.trim() || "Unscramble the letters to spell the word.",
        shuffleLetters: card.letterShuffleLetters,
        caseSensitive: card.letterCaseSensitive,
        autoAdvanceOnPass: true,
      },
    };
  }
  if (format === "flashcards") {
    return {
      afterBridge: "auto",
      flashcards: {
        frontFaces: [...card.flashcardsFrontFaces],
        backFaces: [...card.flashcardsBackFaces],
        shuffleCards: card.flashcardsShuffleCards,
      },
    };
  }
  if (format === "listen_and_choose") {
    return { afterBridge: "auto", listenAndChoose: {} };
  }
  if (format === "line_match") {
    return {
      afterBridge: "auto",
      lineMatch: {
        bodyText:
          card.masterPrompt.trim() || "Draw a line from each word to its picture.",
        autoAdvanceOnPass: true,
      },
    };
  }
  if (format === "true_false") {
    return { afterBridge: "auto", trueFalse: { autoAdvanceOnPass: true } };
  }
  if (format === "sentence_scramble") {
    return {
      afterBridge: "auto",
      sentenceScramble: {
        bodyText: card.masterPrompt.trim() || "Put the words in order.",
        autoAdvanceOnPass: true,
      },
    };
  }
  if (format === "memory") {
    return {
      afterBridge: "auto",
      memory: { textMode: card.memoryTextMode },
    };
  }
  if (format === "crossword") {
    return {
      afterBridge: "auto",
      crossword: { clueMode: card.crosswordClueMode },
    };
  }
  if (format === "wordsearch") {
    return {
      afterBridge: "auto",
      wordSearch: {
        allowBackwards: card.wordSearchAllowBackwards,
        allowDiagonals: card.wordSearchAllowDiagonals,
        allowBackwardsDiagonals: card.wordSearchAllowBackwardsDiagonals,
      },
    };
  }
  return {
    afterBridge: "auto",
    fillBlanks: {
      bodyText: card.masterPrompt.trim() || "Choose the missing word.",
      autoAdvanceOnPass: true,
    },
  };
}

function beatFromCard(
  card: QuizBuilderTrackCard,
  index: number,
  trackId: string,
): LearningTrackBeatInstance {
  if (card.source === "blank" || !card.listId) {
    throw new Error(
      "Mixed One quiz builds a practice track — every card needs a vocabulary list (blank cards can’t join yet).",
    );
  }
  if (card.selectedEntryIds.length === 0) {
    throw new Error(
      `Pick at least one word on the ${formatLabel(card.format)} card.`,
    );
  }

  const kind = card.format as LearningTrackBeatKind;
  const listLabel = card.listName?.trim() || "Vocabulary";
  return createBeatInstance(kind, {
    id: `${trackId}-beat-${index + 1}`,
    label: `${LEARNING_TRACK_BEAT_LABELS[kind]} · ${listLabel}`,
    source: {
      type: "vocab_compile",
      listId: card.listId,
      format: card.format,
      selectedEntryIds: [...card.selectedEntryIds],
    },
    presentation: presentationForCard(card),
  });
}

export function compositionFromQuizBuilderCards(input: {
  trackId: string;
  title: string;
  cards: QuizBuilderTrackCard[];
}): LearningTrackComposition {
  if (input.cards.length < 2) {
    throw new Error("A practice track needs at least two quiz cards.");
  }
  const formats = new Set(input.cards.map((card) => card.format));
  if (formats.size < 2) {
    throw new Error("Same-format cards should merge into one quiz, not a track.");
  }

  const beats = input.cards.map((card, index) =>
    beatFromCard(card, index, input.trackId),
  );
  const title = input.title.trim() || "Practice track from Quiz builder";
  const durationTargetMin = Math.max(
    5,
    Math.round(beats.reduce((sum, beat) => sum + estimatedMinutesForKind(beat.kind), 0)),
  );
  const firstVocab = beats.find((beat) => beat.source.type === "vocab_compile");
  const vocabListId =
    firstVocab?.source.type === "vocab_compile" ? firstVocab.source.listId : undefined;

  return {
    version: 1,
    kind: "learning-track-composition",
    id: `composition-${input.trackId}`,
    packId: `track-${input.trackId}`,
    packTitle: title,
    trackIndex: 1,
    title,
    aim: "Practice these quizzes in order.",
    durationTargetMin,
    ...(vocabListId ? { vocabListId } : {}),
    beats,
  };
}

export function practiceTrackTitleFromCards(cards: QuizBuilderTrackCard[]): string {
  const labels = cards.map((card) => formatLabel(card.format));
  const unique = [...new Set(labels)];
  if (unique.length <= 3) return `Practice · ${unique.join(" + ")}`;
  return `Practice · ${unique.slice(0, 2).join(" + ")} + ${unique.length - 2} more`;
}

/** Create a Track Builder practice draft from mixed Quiz Builder cards. */
export function createPracticeTrackFromQuizCards(
  cards: QuizBuilderTrackCard[],
): ActivityTrackDocument {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const title = practiceTrackTitleFromCards(cards);
  const practiceComposition = compositionFromQuizBuilderCards({
    trackId: id,
    title,
    cards,
  });
  return {
    version: ACTIVITY_TRACK_DOCUMENT_VERSION,
    id,
    mode: "practice",
    title,
    instructions: practiceComposition.aim,
    level: "either",
    estimatedMinutes: practiceComposition.durationTargetMin,
    vocabListId: practiceComposition.vocabListId ?? null,
    parts: [],
    practiceComposition,
    gradedOrigin: null,
    assessmentDefinition: null,
    assessmentOrigin: null,
    libraryId: null,
    bankActivityId: null,
    createdAt: now,
    updatedAt: now,
  };
}
