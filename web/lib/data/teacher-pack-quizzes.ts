import { unstable_noStore as noStore } from "next/cache";
import { cache } from "react";
import { isTeacher } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import type { PackQuizCompiledQuestion, PackQuizFormat } from "@/lib/vocabulary/pack-quiz";

export type TeacherPackQuizStatus = "draft" | "published";

export type TeacherPackQuizRow = {
  id: string;
  teacher_id: string;
  pack_id: string | null;
  title: string;
  format: PackQuizFormat;
  status: TeacherPackQuizStatus;
  word_ids: string[];
  options: Record<string, unknown>;
  questions: PackQuizCompiledQuestion[];
  warnings: string[];
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};

export type TeacherPackQuizSummary = {
  id: string;
  pack_id: string | null;
  title: string;
  format: PackQuizFormat;
  status: TeacherPackQuizStatus;
  questionCount: number;
  wordCount: number;
  updated_at: string;
};

type DbRow = {
  id: string;
  teacher_id: string;
  pack_id: string | null;
  title: string;
  format: string;
  status: string;
  word_ids: unknown;
  options: unknown;
  questions: unknown;
  warnings: unknown;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};

const FORMATS: readonly PackQuizFormat[] = [
  "multiple_choice",
  "true_false",
  "letter_scramble",
  "sentence_scramble",
];

function asFormat(value: string): PackQuizFormat {
  return FORMATS.includes(value as PackQuizFormat)
    ? (value as PackQuizFormat)
    : "multiple_choice";
}

function asStatus(value: string): TeacherPackQuizStatus {
  return value === "published" ? "published" : "draft";
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function asOptions(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function asQuestions(value: unknown): PackQuizCompiledQuestion[] {
  if (!Array.isArray(value)) return [];
  return value as PackQuizCompiledQuestion[];
}

function asWarnings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function mapRow(row: DbRow): TeacherPackQuizRow {
  return {
    id: row.id,
    teacher_id: row.teacher_id,
    pack_id: row.pack_id,
    title: row.title,
    format: asFormat(row.format),
    status: asStatus(row.status),
    word_ids: asStringArray(row.word_ids),
    options: asOptions(row.options),
    questions: asQuestions(row.questions),
    warnings: asWarnings(row.warnings),
    created_at: row.created_at,
    updated_at: row.updated_at,
    archived_at: row.archived_at,
  };
}

async function requireTeacherUserId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id || !isTeacher(user)) {
    throw new Error("Teacher authentication required.");
  }
  return user.id;
}

export const listTeacherPackQuizzes = cache(async function listTeacherPackQuizzes(options?: {
  packId?: string;
}): Promise<TeacherPackQuizSummary[]> {
  noStore();
  await requireTeacherUserId();
  const supabase = await createClient();

  let query = supabase
    .from("teacher_pack_quizzes")
    .select("id, pack_id, title, format, status, word_ids, questions, updated_at, archived_at")
    .is("archived_at", null)
    .order("updated_at", { ascending: false });

  if (options?.packId) {
    query = query.eq("pack_id", options.packId);
  }

  const { data, error } = await query;
  if (error) {
    // Migration 061 not applied yet — degrade to empty list.
    if (/teacher_pack_quizzes|schema cache|does not exist/i.test(error.message)) {
      return [];
    }
    throw error;
  }

  return ((data ?? []) as Pick<
    DbRow,
    "id" | "pack_id" | "title" | "format" | "status" | "word_ids" | "questions" | "updated_at"
  >[]).map((row) => ({
    id: row.id,
    pack_id: row.pack_id,
    title: row.title,
    format: asFormat(row.format),
    status: asStatus(row.status),
    questionCount: asQuestions(row.questions).length,
    wordCount: asStringArray(row.word_ids).length,
    updated_at: row.updated_at,
  }));
});

export const getTeacherPackQuiz = cache(async function getTeacherPackQuiz(
  quizId: string,
): Promise<TeacherPackQuizRow | null> {
  noStore();
  await requireTeacherUserId();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("teacher_pack_quizzes")
    .select("*")
    .eq("id", quizId)
    .maybeSingle();

  if (error) {
    if (/teacher_pack_quizzes|schema cache|does not exist/i.test(error.message)) {
      return null;
    }
    throw error;
  }
  if (!data) return null;
  return mapRow(data as DbRow);
});
