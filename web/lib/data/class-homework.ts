import { unstable_noStore as noStore } from "next/cache";
import { cache } from "react";
import { isStudent, isTeacher } from "@/lib/auth/roles";
import {
  normalizeDueAt,
  normalizeHomeworkInstructions,
  normalizeHomeworkPayload,
  normalizeHomeworkStatus,
  normalizeHomeworkTitle,
} from "@/lib/class-homework/normalize";
import type {
  ClassHomework,
  ClassHomeworkPayload,
  HomeworkCompletionSummary,
  StudentHomeworkCard,
} from "@/lib/class-homework/types";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleSupabase } from "@/lib/supabase/service-role-client";
import { parseStoredPackQuizQuestions } from "@/lib/class-homework/freeze-pack-quiz";
import type { PackQuizCompiledQuestion } from "@/lib/vocabulary/pack-quiz";

type HomeworkRow = {
  id: string;
  class_id: string;
  teacher_id: string;
  title: string;
  instructions: string;
  due_at: string | null;
  status: string;
  payload: unknown;
  assigned_at: string | null;
  created_at: string;
  updated_at: string;
  target_student_ids?: unknown;
};

function isMissingHomeworkTable(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  const message = (error.message ?? "").toLowerCase();
  return (
    message.includes("class_homework") ||
    error.code === "42P01" ||
    error.code === "PGRST205"
  );
}

function isMissingCompletionsTable(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  const message = (error.message ?? "").toLowerCase();
  return (
    message.includes("class_homework_completions") ||
    error.code === "42P01" ||
    error.code === "PGRST205"
  );
}

function mapHomework(row: HomeworkRow): ClassHomework | null {
  const payload = normalizeHomeworkPayload(row.payload);
  if (!payload) return null;
  return {
    id: row.id,
    classId: row.class_id,
    teacherId: row.teacher_id,
    title: normalizeHomeworkTitle(row.title),
    instructions: normalizeHomeworkInstructions(row.instructions),
    dueAt: normalizeDueAt(row.due_at),
    status: normalizeHomeworkStatus(row.status),
    payload,
    assignedAt: typeof row.assigned_at === "string" ? row.assigned_at : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    targetStudentIds: Array.isArray(row.target_student_ids)
      ? row.target_student_ids.filter((id): id is string => typeof id === "string")
      : null,
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

export const listClassHomeworkForClass = cache(async function listClassHomeworkForClass(
  classId: string,
): Promise<ClassHomework[]> {
  noStore();
  await requireTeacherUserId();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("class_homework")
    .select("*")
    .eq("class_id", classId)
    .order("updated_at", { ascending: false });

  if (error) {
    if (isMissingHomeworkTable(error)) return [];
    throw error;
  }

  return ((data ?? []) as HomeworkRow[])
    .map((row) => mapHomework(row))
    .filter((row): row is ClassHomework => Boolean(row));
});

export async function getClassHomework(homeworkId: string): Promise<ClassHomework | null> {
  noStore();
  await requireTeacherUserId();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("class_homework")
    .select("*")
    .eq("id", homeworkId)
    .maybeSingle();

  if (error) {
    if (isMissingHomeworkTable(error)) return null;
    throw error;
  }
  if (!data) return null;
  return mapHomework(data as HomeworkRow);
}

export type PackQuizHomeworkUsage = {
  total: number;
  assigned: number;
  classIds: string[];
};

/** Count class_homework rows that reference each pack quiz (teacher-scoped). */
export const listPackQuizHomeworkUsage = cache(async function listPackQuizHomeworkUsage(): Promise<
  Record<string, PackQuizHomeworkUsage>
> {
  noStore();
  await requireTeacherUserId();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("class_homework")
    .select("class_id, status, payload");

  if (error) {
    if (isMissingHomeworkTable(error)) return {};
    throw error;
  }

  const usage: Record<string, PackQuizHomeworkUsage> = {};
  for (const row of (data ?? []) as Array<{
    class_id: string;
    status: string;
    payload: unknown;
  }>) {
    const payload = normalizeHomeworkPayload(row.payload);
    if (!payload || payload.type !== "pack_quiz") continue;
    const quizId = payload.quizId;
    const entry = usage[quizId] ?? { total: 0, assigned: 0, classIds: [] };
    entry.total += 1;
    if (row.status === "assigned") entry.assigned += 1;
    if (!entry.classIds.includes(row.class_id)) entry.classIds.push(row.class_id);
    usage[quizId] = entry;
  }
  return usage;
});

export async function listAssignedHomeworkForStudent(): Promise<StudentHomeworkCard[]> {
  noStore();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id || !isStudent(user)) return [];

  const { data: memberships, error: membershipError } = await supabase.rpc(
    "student_class_memberships",
  );
  if (membershipError) throw membershipError;

  const classRows = (memberships ?? []) as Array<{
    class_id: string;
    title: string;
  }>;
  if (!classRows.length) return [];

  const classIds = classRows.map((row) => row.class_id);
  const titleByClassId = new Map(classRows.map((row) => [row.class_id, row.title]));

  const { data, error } = await supabase
    .from("class_homework")
    .select("*")
    .in("class_id", classIds)
    .in("status", ["assigned", "closed"])
    .order("due_at", { ascending: true, nullsFirst: false });

  if (error) {
    if (isMissingHomeworkTable(error)) return [];
    throw error;
  }

  const cards = ((data ?? []) as HomeworkRow[])
    .map((row) => {
      const mapped = mapHomework(row);
      if (!mapped) return null;
      if (mapped.status !== "assigned" && mapped.status !== "closed") return null;
      return {
        id: mapped.id,
        classId: mapped.classId,
        classTitle: titleByClassId.get(mapped.classId) ?? "Class",
        title: mapped.title,
        instructions: mapped.instructions,
        dueAt: mapped.dueAt,
        status: mapped.status,
        payload: mapped.payload,
        assignedAt: mapped.assignedAt,
        completedAt: null as string | null,
      } satisfies StudentHomeworkCard;
    })
    .filter((row): row is StudentHomeworkCard => Boolean(row));

  if (cards.length === 0) return [];

  const homeworkIds = cards.map((card) => card.id);
  const { data: completions, error: completionsError } = await supabase
    .from("class_homework_completions")
    .select("homework_id, finished_at")
    .eq("student_id", user.id)
    .in("homework_id", homeworkIds);

  if (completionsError) {
    if (isMissingCompletionsTable(completionsError)) return cards;
    throw completionsError;
  }

  const finishedByHomework = new Map(
    ((completions ?? []) as Array<{ homework_id: string; finished_at: string }>).map((row) => [
      row.homework_id,
      row.finished_at,
    ]),
  );

  return cards.map((card) => ({
    ...card,
    completedAt: finishedByHomework.get(card.id) ?? null,
  }));
}

export async function getHomeworkForStudent(homeworkId: string): Promise<{
  homework: StudentHomeworkCard;
  quizQuestions: PackQuizCompiledQuestion[] | null;
} | null> {
  noStore();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id || !isStudent(user)) return null;

  const { data, error } = await supabase
    .from("class_homework")
    .select("*")
    .eq("id", homeworkId)
    .maybeSingle();

  if (error) {
    if (isMissingHomeworkTable(error)) return null;
    throw error;
  }
  if (!data) return null;

  const mapped = mapHomework(data as HomeworkRow);
  if (!mapped || (mapped.status !== "assigned" && mapped.status !== "closed")) {
    return null;
  }

  const { data: memberships } = await supabase.rpc("student_class_memberships");
  const classRows = (memberships ?? []) as Array<{ class_id: string; title: string }>;
  const membership = classRows.find((row) => row.class_id === mapped.classId);
  if (!membership) return null;

  let completedAt: string | null = null;
  const { data: completion, error: completionError } = await supabase
    .from("class_homework_completions")
    .select("finished_at")
    .eq("homework_id", mapped.id)
    .eq("student_id", user.id)
    .maybeSingle();
  if (completionError) {
    if (!isMissingCompletionsTable(completionError)) throw completionError;
  } else if (completion && typeof completion.finished_at === "string") {
    completedAt = completion.finished_at;
  }

  const homework: StudentHomeworkCard = {
    id: mapped.id,
    classId: mapped.classId,
    classTitle: membership.title,
    title: mapped.title,
    instructions: mapped.instructions,
    dueAt: mapped.dueAt,
    status: mapped.status,
    payload: mapped.payload,
    assignedAt: mapped.assignedAt,
    completedAt,
  };

  let quizQuestions: PackQuizCompiledQuestion[] | null = null;
  if (mapped.payload.type === "pack_quiz") {
    quizQuestions = await loadQuizQuestionsForAssignedHomework(mapped.payload);
  }

  return { homework, quizQuestions };
}

async function loadQuizQuestionsForAssignedHomework(
  payload: Extract<ClassHomeworkPayload, { type: "pack_quiz" }>,
): Promise<PackQuizCompiledQuestion[] | null> {
  if (Array.isArray(payload.questions) && payload.questions.length > 0) {
    return parseStoredPackQuizQuestions(payload.questions);
  }

  // Legacy homework rows (pre-H2): live-load from source quiz.
  const service = createServiceRoleSupabase();
  if (!service) return null;
  const { data, error } = await service
    .from("teacher_pack_quizzes")
    .select("questions, archived_at")
    .eq("id", payload.quizId)
    .maybeSingle();
  if (error || !data || data.archived_at) return null;
  return parseStoredPackQuizQuestions(data.questions);
}

export async function listTeacherPackQuizzesForClass(
  classId: string,
): Promise<
  Array<{
    id: string;
    title: string;
    questionCount: number;
    packId: string | null;
  }>
> {
  noStore();
  await requireTeacherUserId();
  const supabase = await createClient();

  const { data: packs, error: packsError } = await supabase
    .from("teacher_word_packs")
    .select("id")
    .eq("class_id", classId)
    .is("archived_at", null);

  if (packsError) {
    if (/teacher_word_packs|schema cache|does not exist/i.test(packsError.message)) {
      return [];
    }
    throw packsError;
  }

  const packIds = ((packs ?? []) as Array<{ id: string }>).map((row) => row.id);
  if (!packIds.length) return [];

  const { data: quizzes, error } = await supabase
    .from("teacher_pack_quizzes")
    .select("id, pack_id, title, questions, archived_at")
    .in("pack_id", packIds)
    .is("archived_at", null)
    .order("updated_at", { ascending: false });

  if (error) {
    if (/teacher_pack_quizzes|schema cache|does not exist/i.test(error.message)) {
      return [];
    }
    throw error;
  }

  return ((quizzes ?? []) as Array<{
    id: string;
    pack_id: string | null;
    title: string;
    questions: unknown;
  }>).map((row) => ({
    id: row.id,
    title: row.title,
    questionCount: Array.isArray(row.questions) ? row.questions.length : 0,
    packId: row.pack_id,
  }));
}

export async function listTeacherPackFlashcardSetsForClass(
  classId: string,
): Promise<
  Array<{
    id: string;
    title: string;
    cardCount: number;
    packId: string | null;
  }>
> {
  noStore();
  await requireTeacherUserId();
  const supabase = await createClient();

  const { data: packs, error: packsError } = await supabase
    .from("teacher_word_packs")
    .select("id")
    .eq("class_id", classId)
    .is("archived_at", null);

  if (packsError) {
    if (/teacher_word_packs|schema cache|does not exist/i.test(packsError.message)) {
      return [];
    }
    throw packsError;
  }

  const packIds = ((packs ?? []) as Array<{ id: string }>).map((row) => row.id);
  if (!packIds.length) return [];

  const { data: sets, error } = await supabase
    .from("teacher_pack_flashcard_sets")
    .select("id, pack_id, title, cards, archived_at")
    .in("pack_id", packIds)
    .is("archived_at", null)
    .order("updated_at", { ascending: false });

  if (error) {
    if (/teacher_pack_flashcard_sets|schema cache|does not exist/i.test(error.message)) {
      return [];
    }
    throw error;
  }

  return ((sets ?? []) as Array<{
    id: string;
    pack_id: string | null;
    title: string;
    cards: unknown;
  }>).map((row) => ({
    id: row.id,
    title: row.title,
    cardCount: Array.isArray(row.cards) ? row.cards.length : 0,
    packId: row.pack_id,
  }));
}

/** Completions for all homework in a class (teacher). Soft-fails if migration missing. */
export const listClassHomeworkCompletionsForClass = cache(
  async function listClassHomeworkCompletionsForClass(
    classId: string,
  ): Promise<HomeworkCompletionSummary[]> {
    noStore();
    await requireTeacherUserId();
    const supabase = await createClient();

    const { data: homeworkRows, error: homeworkError } = await supabase
      .from("class_homework")
      .select("id")
      .eq("class_id", classId);

    if (homeworkError) {
      if (isMissingHomeworkTable(homeworkError)) return [];
      throw homeworkError;
    }

    const homeworkIds = ((homeworkRows ?? []) as Array<{ id: string }>).map((row) => row.id);
    if (!homeworkIds.length) return [];

    const { data, error } = await supabase
      .from("class_homework_completions")
      .select("homework_id, student_id, finished_at, questions_total")
      .in("homework_id", homeworkIds)
      .order("finished_at", { ascending: false });

    if (error) {
      if (isMissingCompletionsTable(error)) return [];
      throw error;
    }

    return ((data ?? []) as Array<{
      homework_id: string;
      student_id: string;
      finished_at: string;
      questions_total: number;
    }>).map((row) => ({
      homeworkId: row.homework_id,
      studentId: row.student_id,
      finishedAt: row.finished_at,
      questionsTotal:
        typeof row.questions_total === "number" && Number.isFinite(row.questions_total)
          ? Math.max(0, Math.round(row.questions_total))
          : 0,
    }));
  },
);
