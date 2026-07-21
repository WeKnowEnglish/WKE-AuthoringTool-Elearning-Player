"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isTeacher } from "@/lib/auth/roles";
import {
  getPlatformLexiconEntriesByIds,
  listPublishedPlatformLexiconEntries,
  listPublishedPlatformSearchEntries,
} from "@/lib/data/platform-lexicon";
import {
  getTeacherLexiconEntriesByIds,
  listTeacherLexiconEntries,
} from "@/lib/data/teacher-lexicon";
import type { TeacherPackQuizRow } from "@/lib/data/teacher-pack-quizzes";
import { getTeacherWordPack } from "@/lib/data/teacher-word-packs";
import { createClient } from "@/lib/supabase/server";
import { hydratePackLexemeDefinitions } from "@/lib/vocabulary/pack-quiz/hydrate-lexemes";
import type {
  PackQuizCompiledQuestion,
  PackQuizDraft,
  PackQuizFormat,
} from "@/lib/vocabulary/pack-quiz";
import { mergePlatformSearchEntries } from "@/lib/vocabulary/platform-lexicon";
import { getPrimaryVocabularySearchEntries } from "@/lib/vocabulary/primary-candidates";
import {
  mergeTeacherLexiconForPack,
  resolvePackLexemes,
  type PackLexemeResolution,
} from "@/lib/vocabulary/teacher-lexicon";

export type LoadPackQuizLexemesResult =
  | { ok: true; lexemes: PackLexemeResolution[] }
  | { ok: false; error: string };

export type SavePackQuizResult =
  | { ok: true; quiz: TeacherPackQuizRow }
  | { ok: false; error: string };

const TITLE_MAX = 120;
const FORMATS: readonly PackQuizFormat[] = [
  "multiple_choice",
  "true_false",
  "letter_scramble",
  "sentence_scramble",
];

function normalizeTitle(raw: unknown, fallback: string): string {
  const title =
    typeof raw === "string" && raw.trim()
      ? raw.trim().slice(0, TITLE_MAX)
      : fallback.trim().slice(0, TITLE_MAX);
  return title.length > 0 ? title : "Untitled quiz";
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") continue;
    const id = item.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

function mapQuizRow(row: Record<string, unknown>): TeacherPackQuizRow {
  const formatRaw = String(row.format ?? "multiple_choice");
  const format = FORMATS.includes(formatRaw as PackQuizFormat)
    ? (formatRaw as PackQuizFormat)
    : "multiple_choice";
  return {
    id: String(row.id),
    teacher_id: String(row.teacher_id),
    pack_id: typeof row.pack_id === "string" ? row.pack_id : null,
    title: String(row.title),
    format,
    status: row.status === "published" ? "published" : "draft",
    word_ids: asStringArray(row.word_ids),
    options:
      row.options && typeof row.options === "object" && !Array.isArray(row.options)
        ? (row.options as Record<string, unknown>)
        : {},
    questions: Array.isArray(row.questions)
      ? (row.questions as PackQuizCompiledQuestion[])
      : [],
    warnings: Array.isArray(row.warnings)
      ? row.warnings.filter((w): w is string => typeof w === "string")
      : [],
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    archived_at: typeof row.archived_at === "string" ? row.archived_at : null,
  };
}

/**
 * Resolve + hydrate lexemes for a frozen pack-quiz draft.
 * Uses `wordIds` from the draft (not live pack contents) so the freeze holds.
 */
export async function loadPackQuizLexemes(input: {
  packId: string;
  wordIds: readonly string[];
}): Promise<LoadPackQuizLexemesResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id || !isTeacher(user)) {
      return { ok: false, error: "Teacher authentication required." };
    }

    const pack = await getTeacherWordPack(input.packId);
    if (!pack || pack.archived_at) {
      return { ok: false, error: "Word pack not found." };
    }

    const wordIds = [...input.wordIds];

    const [activeLexicon, packLexicon, publishedSearch, platformByIds, publishedFull] =
      await Promise.all([
        listTeacherLexiconEntries().catch(() => []),
        getTeacherLexiconEntriesByIds(wordIds).catch(() => []),
        listPublishedPlatformSearchEntries().catch(() => []),
        getPlatformLexiconEntriesByIds(wordIds).catch(() => []),
        listPublishedPlatformLexiconEntries().catch(() => []),
      ]);

    const teacher = mergeTeacherLexiconForPack(activeLexicon, packLexicon);
    const platform = mergePlatformSearchEntries(
      getPrimaryVocabularySearchEntries(),
      publishedSearch,
    );
    const resolved = resolvePackLexemes(wordIds, platform, teacher);

    const defById = new Map(publishedFull.map((e) => [e.id, e]));
    for (const entry of platformByIds) defById.set(entry.id, entry);

    const defSources = [...defById.values()].filter((entry) => {
      if (wordIds.includes(entry.id)) return true;
      return resolved.some((row) => row.promotedToId === entry.id);
    });

    return {
      ok: true,
      lexemes: hydratePackLexemeDefinitions(resolved, defSources),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load pack words.";
    return { ok: false, error: message };
  }
}

/**
 * Persist a compiled pack quiz as a teacher draft.
 * Stores the frozen wordIds + compiled question payloads (not live pack contents).
 */
export async function savePackQuiz(input: {
  draft: PackQuizDraft;
  questions: readonly PackQuizCompiledQuestion[];
  warnings?: readonly string[];
  title?: string;
}): Promise<SavePackQuizResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id || !isTeacher(user)) {
      return { ok: false, error: "Teacher authentication required." };
    }

    if (!FORMATS.includes(input.draft.format)) {
      return { ok: false, error: "Unknown quiz format." };
    }
    if (input.questions.length === 0) {
      return { ok: false, error: "Nothing to save — compile at least one question first." };
    }

    const pack = await getTeacherWordPack(input.draft.packId);
    if (!pack || pack.archived_at) {
      return { ok: false, error: "Word pack not found." };
    }

    const defaultTitle = `${input.draft.packTitle} · Multiple choice`.slice(0, TITLE_MAX);
    const title = normalizeTitle(input.title, defaultTitle);
    const wordIds = asStringArray(input.draft.wordIds);
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("teacher_pack_quizzes")
      .insert({
        teacher_id: user.id,
        pack_id: input.draft.packId,
        title,
        format: input.draft.format,
        status: "draft",
        word_ids: wordIds,
        options: {
          ...(input.draft.options ?? {}),
          seed: input.draft.createdAt,
        },
        questions: [...input.questions],
        warnings: [...(input.warnings ?? [])],
        updated_at: now,
      })
      .select("*")
      .single();

    if (error || !data) {
      if (/teacher_pack_quizzes|schema cache|does not exist/i.test(error?.message ?? "")) {
        return {
          ok: false,
          error: "Save isn’t available yet — apply migration 061_teacher_pack_quizzes.",
        };
      }
      return { ok: false, error: error?.message ?? "Failed to save quiz." };
    }

    revalidatePath("/teacher/word-packs");
    revalidatePath(`/teacher/word-packs/${input.draft.packId}`);

    return { ok: true, quiz: mapQuizRow(data as Record<string, unknown>) };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save quiz.";
    return { ok: false, error: message };
  }
}

export async function archiveTeacherPackQuiz(quizId: string): Promise<SavePackQuizResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id || !isTeacher(user)) {
      return { ok: false, error: "Teacher authentication required." };
    }

    const id = quizId.trim();
    if (!id) return { ok: false, error: "Quiz id required." };

    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("teacher_pack_quizzes")
      .update({ archived_at: now, updated_at: now })
      .eq("id", id)
      .is("archived_at", null)
      .select("*")
      .maybeSingle();

    if (error) {
      if (/teacher_pack_quizzes|schema cache|does not exist/i.test(error.message)) {
        return {
          ok: false,
          error: "Archive isn’t available yet — apply migration 061_teacher_pack_quizzes.",
        };
      }
      return { ok: false, error: error.message };
    }
    if (!data) return { ok: false, error: "Quiz not found." };

    revalidatePath("/teacher/word-packs");
    return { ok: true, quiz: mapQuizRow(data as Record<string, unknown>) };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to archive quiz.";
    return { ok: false, error: message };
  }
}

export async function archiveTeacherPackQuizFromForm(formData: FormData): Promise<void> {
  const quizId = String(formData.get("quiz_id") ?? "");
  const result = await archiveTeacherPackQuiz(quizId);
  if (!result.ok) {
    redirect("/teacher/word-packs?tab=quizzes&error=quiz_archive_failed");
  }
  redirect("/teacher/word-packs?tab=quizzes&archived_quiz=1");
}

export type LoadSavedPackQuizResult =
  | { ok: true; quiz: TeacherPackQuizRow }
  | { ok: false; error: string };

export async function loadSavedPackQuiz(quizId: string): Promise<LoadSavedPackQuizResult> {
  try {
    const { getTeacherPackQuiz } = await import("@/lib/data/teacher-pack-quizzes");
    const quiz = await getTeacherPackQuiz(quizId);
    if (!quiz || quiz.archived_at) {
      return { ok: false, error: "Quiz not found." };
    }
    return { ok: true, quiz };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load quiz.";
    return { ok: false, error: message };
  }
}

