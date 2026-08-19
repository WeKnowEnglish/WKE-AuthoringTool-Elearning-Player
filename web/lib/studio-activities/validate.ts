import { parseGamesFlashcardsLessonPlayerPack } from "@/lib/games-flashcards/parse-games-pack";
import { parseGamesLetterMixupLessonPlayerPack } from "@/lib/games-letter-mixup/parse-games-pack";
import { parseGamesMcQuizLessonPlayerPack } from "@/lib/games-mc-quiz/parse-games-pack";
import { parseGamesListenAndChooseLessonPlayerPack } from "@/lib/games-listen-choose/parse-games-pack";
import { parseGamesLineMatchLessonPlayerPack } from "@/lib/games-line-match/parse-games-pack";
import { parseGamesSentenceScrambleLessonPlayerPack } from "@/lib/games-sentence-scramble/parse-games-pack";
import { parseGamesFillBlanksLessonPlayerPack } from "@/lib/games-fill-blanks/parse-games-pack";
import { parseGamesTrueFalseLessonPlayerPack } from "@/lib/games-true-false/parse-games-pack";
import { parseGamesWordGameLessonPlayerPack } from "@/lib/games-word-games/parse-games-pack";
import { parseLearningTrackLessonPlayerPack } from "@/lib/learning-tracks/parse-track-pack";
import { validateVocabularyListDocument } from "@/lib/activity-builder/vocabulary-list/document";
import type { VocabularyListDocument } from "@/lib/activity-builder/vocabulary-list/types";
import { validateExploreHotspotsDocument } from "@/lib/hotspots/studio";
import { wkeActivityToExploreHotspotsPayload } from "@/lib/wke-activity/to-lesson-screen";
import {
  pictureClozeStubPack,
  validatePictureClozeDocument,
} from "@/lib/picture-cloze";
import {
  validateVerbTableDocument,
  verbTableStubPack,
} from "@/lib/verb-table";
import {
  sentenceColumnsStubPack,
  validateSentenceColumnsDocument,
} from "@/lib/sentence-columns";
import {
  validateWordAnnotationDocument,
  wordAnnotationStubPack,
} from "@/lib/word-annotation";
import {
  pictureWritingStubPack,
  validatePictureWritingDocument,
} from "@/lib/picture-writing";
import {
  questionWritingStubPack,
  validateQuestionWritingDocument,
} from "@/lib/question-writing";
import {
  definitionMatchStubPack,
  validateDefinitionMatchDocument,
} from "@/lib/definition-match";
import {
  clozeChoiceStubPack,
  validateClozeChoiceDocument,
} from "@/lib/cloze-choice";
import {
  clozeOpenStubPack,
  validateClozeOpenDocument,
} from "@/lib/cloze-open";
import {
  readAndAnswerStubPack,
  validateReadAndAnswerDocument,
} from "@/lib/read-and-answer";
import {
  pictureStoryStubPack,
  validatePictureStoryDocument,
} from "@/lib/picture-story";
import {
  STUDIO_ACTIVITY_FORMATS,
  type StudioActivityFormat,
} from "@/lib/studio-activities/types";

export const STUDIO_ACTIVITY_TITLE_MAX = 160;

export function isStudioActivityFormat(value: unknown): value is StudioActivityFormat {
  return (
    typeof value === "string" &&
    (STUDIO_ACTIVITY_FORMATS as readonly string[]).includes(value)
  );
}

export function normalizeStudioActivityTitle(raw: string | null | undefined): string {
  const title = raw?.trim() ?? "";
  if (!title) throw new Error("title is required.");
  if (title.length > STUDIO_ACTIVITY_TITLE_MAX) {
    throw new Error(`title must be at most ${STUDIO_ACTIVITY_TITLE_MAX} characters.`);
  }
  return title;
}

/** Thin pack stub so studio_activities.pack stays a non-null object for vocab rows. */
export function vocabularyListStubPack(
  document: VocabularyListDocument,
): Record<string, unknown> {
  return {
    version: 1,
    kind: "vocabulary-list-pack",
    id: document.id,
    name: document.name,
    entry_count: document.entries.length,
    ...(document.cefr ? { cefr: document.cefr } : {}),
  };
}

export { pictureClozeStubPack } from "@/lib/picture-cloze/document";
export { verbTableStubPack } from "@/lib/verb-table/document";
export { sentenceColumnsStubPack } from "@/lib/sentence-columns/document";
export { wordAnnotationStubPack } from "@/lib/word-annotation/document";
export { pictureWritingStubPack } from "@/lib/picture-writing/document";
export { questionWritingStubPack } from "@/lib/question-writing/document";
export { definitionMatchStubPack } from "@/lib/definition-match/document";
export { clozeChoiceStubPack } from "@/lib/cloze-choice/document";
export { clozeOpenStubPack } from "@/lib/cloze-open/document";
export { readAndAnswerStubPack } from "@/lib/read-and-answer/document";
export { pictureStoryStubPack } from "@/lib/picture-story/document";

export function normalizeOptionalAuthoring(raw: unknown): Record<string, unknown> | null {
  if (raw == null) return null;
  if (typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("authoring must be a JSON object when provided.");
  }
  return raw as Record<string, unknown>;
}

function packResult(
  parsed: { quiz_group_title?: string; activity_name?: string; [key: string]: unknown },
  authoring: unknown,
) {
  return {
    pack: parsed as unknown as Record<string, unknown>,
    defaultTitle: parsed.quiz_group_title || parsed.activity_name || "Quiz",
    authoring: normalizeOptionalAuthoring(authoring),
  };
}

/** Validate pack with the same parsers pilots use; return canonical pack + default title. */
export function validateStudioActivityPack(
  format: StudioActivityFormat,
  pack: unknown,
  authoring?: unknown,
): {
  pack: Record<string, unknown>;
  defaultTitle: string;
  authoring: Record<string, unknown> | null;
} {
  if (format === "vocabulary_list") {
    const document = validateVocabularyListDocument(
      authoring ??
        (pack &&
        typeof pack === "object" &&
        !Array.isArray(pack) &&
        (pack as { list?: unknown }).list
          ? (pack as { list: unknown }).list
          : pack),
    );
    return {
      pack: vocabularyListStubPack(document),
      defaultTitle: document.name,
      authoring: document as unknown as Record<string, unknown>,
    };
  }

  if (format === "picture_cloze") {
    const document = validatePictureClozeDocument(
      authoring ??
        (pack &&
        typeof pack === "object" &&
        !Array.isArray(pack) &&
        (pack as { document?: unknown }).document
          ? (pack as { document: unknown }).document
          : pack),
    );
    return {
      pack: pictureClozeStubPack(document),
      defaultTitle: document.title,
      authoring: document as unknown as Record<string, unknown>,
    };
  }

  if (format === "verb_table") {
    const document = validateVerbTableDocument(
      authoring ??
        (pack &&
        typeof pack === "object" &&
        !Array.isArray(pack) &&
        (pack as { document?: unknown }).document
          ? (pack as { document: unknown }).document
          : pack),
    );
    return {
      pack: verbTableStubPack(document),
      defaultTitle: document.title,
      authoring: document as unknown as Record<string, unknown>,
    };
  }

  if (format === "sentence_columns") {
    const document = validateSentenceColumnsDocument(
      authoring ??
        (pack &&
        typeof pack === "object" &&
        !Array.isArray(pack) &&
        (pack as { document?: unknown }).document
          ? (pack as { document: unknown }).document
          : pack),
    );
    return {
      pack: sentenceColumnsStubPack(document),
      defaultTitle: document.title,
      authoring: document as unknown as Record<string, unknown>,
    };
  }

  if (format === "word_annotation") {
    const document = validateWordAnnotationDocument(
      authoring ??
        (pack &&
        typeof pack === "object" &&
        !Array.isArray(pack) &&
        (pack as { document?: unknown }).document
          ? (pack as { document: unknown }).document
          : pack),
    );
    return {
      pack: wordAnnotationStubPack(document),
      defaultTitle: document.title,
      authoring: document as unknown as Record<string, unknown>,
    };
  }

  if (format === "picture_writing") {
    const document = validatePictureWritingDocument(
      authoring ??
        (pack &&
        typeof pack === "object" &&
        !Array.isArray(pack) &&
        (pack as { document?: unknown }).document
          ? (pack as { document: unknown }).document
          : pack),
    );
    return {
      pack: pictureWritingStubPack(document),
      defaultTitle: document.title,
      authoring: document as unknown as Record<string, unknown>,
    };
  }

  if (format === "question_writing") {
    const document = validateQuestionWritingDocument(
      authoring ??
        (pack &&
        typeof pack === "object" &&
        !Array.isArray(pack) &&
        (pack as { document?: unknown }).document
          ? (pack as { document: unknown }).document
          : pack),
    );
    return {
      pack: questionWritingStubPack(document),
      defaultTitle: document.title,
      authoring: document as unknown as Record<string, unknown>,
    };
  }

  if (format === "definition_match") {
    const document = validateDefinitionMatchDocument(
      authoring ??
        (pack &&
        typeof pack === "object" &&
        !Array.isArray(pack) &&
        (pack as { document?: unknown }).document
          ? (pack as { document: unknown }).document
          : pack),
    );
    return {
      pack: definitionMatchStubPack(document),
      defaultTitle: document.title,
      authoring: document as unknown as Record<string, unknown>,
    };
  }

  if (format === "cloze_choice") {
    const document = validateClozeChoiceDocument(
      authoring ??
        (pack &&
        typeof pack === "object" &&
        !Array.isArray(pack) &&
        (pack as { document?: unknown }).document
          ? (pack as { document: unknown }).document
          : pack),
    );
    return {
      pack: clozeChoiceStubPack(document),
      defaultTitle: document.title,
      authoring: document as unknown as Record<string, unknown>,
    };
  }

  if (format === "cloze_open") {
    const document = validateClozeOpenDocument(
      authoring ??
        (pack &&
        typeof pack === "object" &&
        !Array.isArray(pack) &&
        (pack as { document?: unknown }).document
          ? (pack as { document: unknown }).document
          : pack),
    );
    return {
      pack: clozeOpenStubPack(document),
      defaultTitle: document.title,
      authoring: document as unknown as Record<string, unknown>,
    };
  }

  if (format === "read_and_answer") {
    const document = validateReadAndAnswerDocument(
      authoring ??
        (pack &&
        typeof pack === "object" &&
        !Array.isArray(pack) &&
        (pack as { document?: unknown }).document
          ? (pack as { document: unknown }).document
          : pack),
    );
    return {
      pack: readAndAnswerStubPack(document),
      defaultTitle: document.title,
      authoring: document as unknown as Record<string, unknown>,
    };
  }

  if (format === "picture_story") {
    const document = validatePictureStoryDocument(
      authoring ??
        (pack &&
        typeof pack === "object" &&
        !Array.isArray(pack) &&
        (pack as { document?: unknown }).document
          ? (pack as { document: unknown }).document
          : pack),
    );
    return {
      pack: pictureStoryStubPack(document),
      defaultTitle: document.title,
      authoring: document as unknown as Record<string, unknown>,
    };
  }

  if (format === "explore_hotspots") {
    const document = validateExploreHotspotsDocument(authoring ?? pack);
    const payload = wkeActivityToExploreHotspotsPayload(document);
    return {
      pack: payload as unknown as Record<string, unknown>,
      defaultTitle: document.name,
      authoring: document as unknown as Record<string, unknown>,
    };
  }

  if (format === "multiple_choice") {
    return packResult(parseGamesMcQuizLessonPlayerPack(pack), authoring);
  }
  if (format === "letter_mixup") {
    return packResult(parseGamesLetterMixupLessonPlayerPack(pack), authoring);
  }
  if (format === "flashcards") {
    return packResult(parseGamesFlashcardsLessonPlayerPack(pack), authoring);
  }
  if (format === "listen_and_choose") {
    return packResult(parseGamesListenAndChooseLessonPlayerPack(pack), authoring);
  }
  if (format === "line_match") {
    return packResult(parseGamesLineMatchLessonPlayerPack(pack), authoring);
  }
  if (format === "sentence_scramble") {
    return packResult(parseGamesSentenceScrambleLessonPlayerPack(pack), authoring);
  }
  if (format === "fill_blanks") {
    return packResult(parseGamesFillBlanksLessonPlayerPack(pack), authoring);
  }
  if (format === "true_false") {
    return packResult(parseGamesTrueFalseLessonPlayerPack(pack), authoring);
  }
  if (format === "wordsearch" || format === "crossword" || format === "memory") {
    return packResult(parseGamesWordGameLessonPlayerPack(pack, format), authoring);
  }

  const parsed = parseLearningTrackLessonPlayerPack(pack);
  return {
    pack: parsed as unknown as Record<string, unknown>,
    defaultTitle: parsed.title || parsed.pack_title,
    authoring: normalizeOptionalAuthoring(authoring),
  };
}

export function normalizeStudioActivitySource(
  raw: unknown,
  extras?: Record<string, unknown>,
): Record<string, unknown> {
  const base =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? { ...(raw as Record<string, unknown>) }
      : {};
  return { ...base, ...extras };
}
