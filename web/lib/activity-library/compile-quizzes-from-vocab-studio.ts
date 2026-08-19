import {
  compileQuizzesFromVocabList,
  type CompileQuizzesFromVocabListInput,
  type VocabCompileAuthoringDocument,
  type VocabCompileFormat,
  type VocabCompileSkipped,
} from "@/lib/activity-builder/games/compile-from-vocab-list";
import { exportCoreModuleToLessonPlayer } from "@/lib/activity-builder/core-modules/registry";
import {
  countLocalVocabMedia,
  publishLocalVocabMedia,
  validateVocabularyListDocument,
  type VocabularyListDocument,
} from "@/lib/activity-builder/vocabulary-list";
import { enrichVocabListMediaFromLexicon } from "@/lib/actions/lexicon-media";
import {
  bankPathForStudioActivity,
  playPathForStudioActivity,
} from "@/lib/studio-activities/paths";
import type { StudioActivityFormat } from "@/lib/studio-activities/types";

export type BuiltVocabQuizPack = {
  format: VocabCompileFormat;
  label: string;
  itemCount: number;
  title: string;
  filename: string;
  authoring: VocabCompileAuthoringDocument;
  pack: unknown;
};

export type BuiltVocabQuizPacks = {
  packs: BuiltVocabQuizPack[];
  skipped: VocabCompileSkipped[];
};

export type PublishedVocabQuiz = {
  format: VocabCompileFormat;
  label: string;
  id: string;
  title: string;
  itemCount: number;
  playPath: string;
  bankPath: string;
};

export type VocabActivityGenerationRecipe = {
  kind: "vocabulary_list";
  version: 1;
  vocabListId: string;
  format: VocabCompileFormat;
  selectedEntryIds?: string[];
  settings?: {
    mcMasterQuestion?: string;
    mcOptionCount?: number;
    mcShuffleOptions?: boolean;
    mcStableItems?: boolean;
    letterPrompt?: string;
    letterShuffleLetters?: boolean;
    letterCaseSensitive?: boolean;
    wordGamePrompt?: string;
    flashcardsShuffleCards?: boolean;
    flashcardsFrontFaces?: CompileQuizzesFromVocabListInput["flashcardsFrontFaces"];
    flashcardsBackFaces?: CompileQuizzesFromVocabListInput["flashcardsBackFaces"];
    memoryTextMode?: CompileQuizzesFromVocabListInput["memoryTextMode"];
    crosswordClueMode?: CompileQuizzesFromVocabListInput["crosswordClueMode"];
  };
};

export type LinkedVocabActivity = PublishedVocabQuiz & {
  updatedAt: string;
  source: Record<string, unknown>;
  recipe: VocabActivityGenerationRecipe | null;
};

export function vocabActivityGenerationRecipe(input: {
  vocabListId: string;
  format: VocabCompileFormat;
  selectedEntryIds?: string[];
  settings?: VocabActivityGenerationRecipe["settings"];
}): VocabActivityGenerationRecipe {
  return {
    kind: "vocabulary_list",
    version: 1,
    vocabListId: input.vocabListId,
    format: input.format,
    ...(input.selectedEntryIds?.length
      ? { selectedEntryIds: [...input.selectedEntryIds] }
      : {}),
    ...(input.settings ? { settings: input.settings } : {}),
  };
}

function readGenerationRecipe(
  source: Record<string, unknown>,
  fallbackFormat: VocabCompileFormat,
): VocabActivityGenerationRecipe | null {
  const raw = source.generation;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const row = raw as Record<string, unknown>;
  if (row.kind !== "vocabulary_list" || row.version !== 1) return null;
  if (typeof row.vocabListId !== "string" || !row.vocabListId.trim()) return null;
  const format = typeof row.format === "string" ? row.format : fallbackFormat;
  if (!VOCAB_COMPILE_FORMAT_OPTIONS.some((option) => option.format === format)) return null;
  return row as unknown as VocabActivityGenerationRecipe;
}

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "vocab-quiz"
  );
}

function authoringTitle(document: VocabCompileAuthoringDocument): string {
  return document.name.trim() || "Vocabulary quiz";
}

function exportPackForFormat(
  format: VocabCompileFormat,
  document: VocabCompileAuthoringDocument,
): unknown {
  return exportCoreModuleToLessonPlayer(format, document);
}

/** Compile vocab entries into Lesson Player quiz packs (no network). */
export function buildQuizPacksFromVocabList(
  input: CompileQuizzesFromVocabListInput,
): BuiltVocabQuizPacks {
  const compiled = compileQuizzesFromVocabList(input);
  const packs: BuiltVocabQuizPack[] = compiled.results.map((result) => {
    const title = authoringTitle(result.document);
    return {
      format: result.format,
      label: result.label,
      itemCount: result.itemCount,
      title,
      filename: `${slugify(title)}.lessonplayer.json`,
      authoring: result.document,
      pack: exportPackForFormat(result.format, result.document),
    };
  });
  return { packs, skipped: compiled.skipped };
}

async function publishOneQuizPack(input: {
  built: BuiltVocabQuizPack;
  vocabListId?: string | null;
  skippedCount: number;
  activityId?: string | null;
  title?: string | null;
  existingSource?: Record<string, unknown>;
  recipe?: VocabActivityGenerationRecipe;
}): Promise<PublishedVocabQuiz> {
  const response = await fetch("/api/studio/activities", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...(input.activityId ? { id: input.activityId } : {}),
      format: input.built.format as StudioActivityFormat,
      pack: input.built.pack,
      authoring: input.built.authoring,
      title: input.title?.trim() || input.built.title,
      filename: input.built.filename,
      source: {
        ...(input.existingSource ?? {}),
        via: input.activityId
          ? "vocabulary_list_refresh"
          : "vocabulary_list_compile",
        ...(input.vocabListId ? { vocabListId: input.vocabListId } : {}),
        ...(input.recipe ? { generation: input.recipe } : {}),
        itemCount: input.built.itemCount,
        skippedCount: input.skippedCount,
      },
    }),
  });

  const payload = (await response.json().catch(() => null)) as {
    ok?: boolean;
    id?: string;
    title?: string;
    playPath?: string;
    error?: string;
  } | null;

  if (!response.ok || !payload?.ok || !payload.id) {
    throw new Error(
      payload?.error ||
        `Could not publish ${input.built.label} (${response.status}).`,
    );
  }

  const playPath =
    payload.playPath ||
    playPathForStudioActivity(input.built.format as StudioActivityFormat, payload.id);

  return {
    format: input.built.format,
    label: input.built.label,
    id: payload.id,
    title: payload.title ?? input.built.title,
    itemCount: input.built.itemCount,
    playPath,
    bankPath: bankPathForStudioActivity(payload.id),
  };
}

/**
 * Upload local vocab media if needed, compile selected formats, publish each
 * quiz to Activity Bank (`studio_activities`).
 */
export async function compileAndPublishQuizzesFromVocabList(input: {
  list: VocabularyListDocument;
  formats: VocabCompileFormat[];
  selectedEntryIds?: string[];
  vocabListId?: string | null;
  mcMasterQuestion?: string;
  mcOptionCount?: number;
  letterPrompt?: string;
}): Promise<{
  list: VocabularyListDocument;
  published: PublishedVocabQuiz[];
  skipped: VocabCompileSkipped[];
}> {
  if (!input.formats.length) {
    throw new Error("Choose at least one quiz format.");
  }

  let list = validateVocabularyListDocument(input.list);
  const local = countLocalVocabMedia(list);
  if (local.total > 0) {
    const publishedMedia = await publishLocalVocabMedia(list);
    list = validateVocabularyListDocument(publishedMedia.document);
    const stillLocal = countLocalVocabMedia(list);
    if (stillLocal.total > 0) {
      throw new Error(
        `Could not upload all media (${stillLocal.total} still local). Save the list, then try compile again.`,
      );
    }
  }

  // Pull linked dictionary media into empty picture/audio slots before compile.
  list = validateVocabularyListDocument(
    await enrichVocabListMediaFromLexicon(list),
  );

  const built = buildQuizPacksFromVocabList({
    list,
    formats: input.formats,
    selectedEntryIds: input.selectedEntryIds,
    mcMasterQuestion: input.mcMasterQuestion,
    mcOptionCount: input.mcOptionCount,
    letterPrompt: input.letterPrompt,
  });

  if (built.packs.length < 1) {
    throw new Error("Nothing to publish — every selected word was skipped.");
  }

  const published: PublishedVocabQuiz[] = [];
  for (const pack of built.packs) {
    const recipe = input.vocabListId
      ? vocabActivityGenerationRecipe({
          vocabListId: input.vocabListId,
          format: pack.format,
          selectedEntryIds: input.selectedEntryIds,
          settings: {
            mcMasterQuestion: input.mcMasterQuestion,
            mcOptionCount: input.mcOptionCount,
            letterPrompt: input.letterPrompt,
          },
        })
      : undefined;
    published.push(
      await publishOneQuizPack({
        built: pack,
        vocabListId: input.vocabListId,
        skippedCount: built.skipped.filter((row) => row.format === pack.format)
          .length,
        recipe,
      }),
    );
  }

  return { list, published, skipped: built.skipped };
}

export async function listActivitiesGeneratedFromVocabList(
  vocabListId: string,
): Promise<LinkedVocabActivity[]> {
  const response = await fetch(
    `/api/studio/activities?source_vocab_list_id=${encodeURIComponent(vocabListId)}&limit=100`,
    {
    method: "GET",
    credentials: "same-origin",
    },
  );
  const payload = (await response.json().catch(() => null)) as {
    ok?: boolean;
    activities?: Array<{
      id: string;
      title: string;
      format: StudioActivityFormat;
      updated_at: string;
      source?: Record<string, unknown>;
    }>;
    error?: string;
  } | null;
  if (!response.ok || !payload?.ok || !Array.isArray(payload.activities)) {
    throw new Error(payload?.error || "Could not load linked activities.");
  }

  return payload.activities.flatMap((activity) => {
    const format = activity.format as VocabCompileFormat;
    if (!VOCAB_COMPILE_FORMAT_OPTIONS.some((option) => option.format === format)) return [];
    const source = activity.source && typeof activity.source === "object"
      ? activity.source
      : {};
    const recipe = readGenerationRecipe(source, format);
    const sourceListId = recipe?.vocabListId ??
      (typeof source.vocabListId === "string" ? source.vocabListId : null);
    if (sourceListId !== vocabListId) return [];
    const itemCount = typeof source.itemCount === "number" ? source.itemCount : 0;
    return [{
      id: activity.id,
      title: activity.title,
      format,
      label: VOCAB_COMPILE_FORMAT_OPTIONS.find((option) => option.format === format)?.label ?? format,
      itemCount,
      playPath: playPathForStudioActivity(activity.format, activity.id),
      bankPath: bankPathForStudioActivity(activity.id),
      updatedAt: activity.updated_at,
      source,
      recipe,
    }];
  });
}

export async function refreshActivitiesFromVocabList(input: {
  list: VocabularyListDocument;
  vocabListId: string;
  activities: LinkedVocabActivity[];
}): Promise<{
  list: VocabularyListDocument;
  refreshed: PublishedVocabQuiz[];
  skipped: VocabCompileSkipped[];
}> {
  let list = validateVocabularyListDocument(input.list);
  const local = countLocalVocabMedia(list);
  if (local.total > 0) {
    const publishedMedia = await publishLocalVocabMedia(list);
    list = validateVocabularyListDocument(publishedMedia.document);
    const stillLocal = countLocalVocabMedia(list);
    if (stillLocal.total > 0) {
      throw new Error(`Could not upload all media (${stillLocal.total} still local).`);
    }
  }
  list = validateVocabularyListDocument(await enrichVocabListMediaFromLexicon(list));

  const refreshed: PublishedVocabQuiz[] = [];
  const skipped: VocabCompileSkipped[] = [];
  for (const activity of input.activities) {
    const recipe = activity.recipe ?? vocabActivityGenerationRecipe({
      vocabListId: input.vocabListId,
      format: activity.format,
    });
    const built = buildQuizPacksFromVocabList({
      list,
      formats: [activity.format],
      selectedEntryIds: recipe.selectedEntryIds,
      ...(recipe.settings ?? {}),
    });
    const pack = built.packs[0];
    if (!pack) throw new Error(`Could not rebuild ${activity.title}.`);
    skipped.push(...built.skipped);
    refreshed.push(await publishOneQuizPack({
      built: pack,
      activityId: activity.id,
      title: activity.title,
      vocabListId: input.vocabListId,
      skippedCount: built.skipped.length,
      existingSource: activity.source,
      recipe,
    }));
  }
  return { list, refreshed, skipped };
}

export const VOCAB_COMPILE_FORMAT_OPTIONS: Array<{
  format: VocabCompileFormat;
  label: string;
}> = [
  { format: "multiple_choice", label: "Multiple choice" },
  { format: "letter_mixup", label: "Letter scramble" },
  { format: "flashcards", label: "Flashcards" },
  { format: "listen_and_choose", label: "Listen and choose" },
  { format: "line_match", label: "Line match" },
  { format: "true_false", label: "True / false" },
  { format: "sentence_scramble", label: "Sentence scramble" },
  { format: "fill_blanks", label: "Fill in the blanks" },
];
