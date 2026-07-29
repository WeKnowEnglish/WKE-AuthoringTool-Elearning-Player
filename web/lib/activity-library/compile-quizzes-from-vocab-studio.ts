import {
  compileQuizzesFromVocabList,
  type CompileQuizzesFromVocabListInput,
  type VocabCompileFormat,
  type VocabCompileSkipped,
} from "@/lib/activity-builder/games/compile-from-vocab-list";
import { exportGamesFlashcardsForLessonPlayer } from "@/lib/activity-builder/games/flashcards";
import { exportGamesLetterMixupForLessonPlayer } from "@/lib/activity-builder/games/letter-mixup";
import { exportGamesMcQuizForLessonPlayer } from "@/lib/activity-builder/games/mc-quiz";
import type { GamesAuthoringDocument } from "@/lib/activity-builder/games/types-mc";
import type { GamesLetterMixupAuthoringDocument } from "@/lib/activity-builder/games/types-letter-mixup";
import type { GamesFlashcardsAuthoringDocument } from "@/lib/activity-builder/games/types-flashcards";
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
  authoring:
    | GamesAuthoringDocument
    | GamesLetterMixupAuthoringDocument
    | GamesFlashcardsAuthoringDocument;
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

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "vocab-quiz"
  );
}

function authoringTitle(
  document:
    | GamesAuthoringDocument
    | GamesLetterMixupAuthoringDocument
    | GamesFlashcardsAuthoringDocument,
): string {
  return document.name.trim() || "Vocabulary quiz";
}

function exportPackForFormat(
  format: VocabCompileFormat,
  document:
    | GamesAuthoringDocument
    | GamesLetterMixupAuthoringDocument
    | GamesFlashcardsAuthoringDocument,
): unknown {
  if (format === "multiple_choice") {
    return exportGamesMcQuizForLessonPlayer(document as GamesAuthoringDocument);
  }
  if (format === "letter_mixup") {
    return exportGamesLetterMixupForLessonPlayer(
      document as GamesLetterMixupAuthoringDocument,
    );
  }
  return exportGamesFlashcardsForLessonPlayer(
    document as GamesFlashcardsAuthoringDocument,
  );
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
}): Promise<PublishedVocabQuiz> {
  const response = await fetch("/api/studio/activities", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      format: input.built.format as StudioActivityFormat,
      pack: input.built.pack,
      authoring: input.built.authoring,
      title: input.built.title,
      filename: input.built.filename,
      source: {
        via: "vocabulary_list_compile",
        ...(input.vocabListId ? { vocabListId: input.vocabListId } : {}),
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
    published.push(
      await publishOneQuizPack({
        built: pack,
        vocabListId: input.vocabListId,
        skippedCount: built.skipped.filter((row) => row.format === pack.format)
          .length,
      }),
    );
  }

  return { list, published, skipped: built.skipped };
}

export const VOCAB_COMPILE_FORMAT_OPTIONS: Array<{
  format: VocabCompileFormat;
  label: string;
}> = [
  { format: "multiple_choice", label: "Multiple choice" },
  { format: "letter_mixup", label: "Letter scramble" },
  { format: "flashcards", label: "Flashcards" },
];
