import { parseGamesFlashcardsLessonPlayerPack } from "@/lib/games-flashcards/parse-games-pack";
import { parseGamesLetterMixupLessonPlayerPack } from "@/lib/games-letter-mixup/parse-games-pack";
import { parseGamesMcQuizLessonPlayerPack } from "@/lib/games-mc-quiz/parse-games-pack";
import { parseLearningTrackLessonPlayerPack } from "@/lib/learning-tracks/parse-track-pack";
import { validateVocabularyListDocument } from "@/lib/activity-builder/vocabulary-list/document";
import type { VocabularyListDocument } from "@/lib/activity-builder/vocabulary-list/types";
import { validateExploreHotspotsDocument } from "@/lib/hotspots/studio";
import { wkeActivityToExploreHotspotsPayload } from "@/lib/wke-activity/to-lesson-screen";
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

export function normalizeOptionalAuthoring(raw: unknown): Record<string, unknown> | null {
  if (raw == null) return null;
  if (typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("authoring must be a JSON object when provided.");
  }
  return raw as Record<string, unknown>;
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
    const parsed = parseGamesMcQuizLessonPlayerPack(pack);
    return {
      pack: parsed as unknown as Record<string, unknown>,
      defaultTitle: parsed.quiz_group_title || parsed.activity_name,
      authoring: normalizeOptionalAuthoring(authoring),
    };
  }
  if (format === "letter_mixup") {
    const parsed = parseGamesLetterMixupLessonPlayerPack(pack);
    return {
      pack: parsed as unknown as Record<string, unknown>,
      defaultTitle: parsed.quiz_group_title || parsed.activity_name,
      authoring: normalizeOptionalAuthoring(authoring),
    };
  }
  if (format === "flashcards") {
    const parsed = parseGamesFlashcardsLessonPlayerPack(pack);
    return {
      pack: parsed as unknown as Record<string, unknown>,
      defaultTitle: parsed.quiz_group_title || parsed.activity_name,
      authoring: normalizeOptionalAuthoring(authoring),
    };
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
