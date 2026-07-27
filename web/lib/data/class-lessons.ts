import { unstable_noStore as noStore } from "next/cache";
import { cache } from "react";
import { isStudent, isTeacher } from "@/lib/auth/roles";
import {
  mapDbStepRow,
  normalizeClassLessonNotes,
  normalizeClassLessonStatus,
  normalizeClassLessonTitle,
  isClassLessonStepKind,
} from "@/lib/class-lessons/normalize";
import type {
  ClassLesson,
  ClassLessonSummary,
  ClassLessonStepKind,
  StudentClassMaterial,
} from "@/lib/class-lessons/types";
import { createClient } from "@/lib/supabase/server";

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

function isMissingClassLessonsTable(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  const message = (error.message ?? "").toLowerCase();
  return (
    message.includes("class_lessons") ||
    message.includes("class_lesson_steps") ||
    error.code === "42P01" ||
    error.code === "PGRST205"
  );
}

type LessonRow = {
  id: string;
  class_id: string;
  teacher_id: string;
  title: string;
  status: string;
  notes: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

type StepRow = {
  id: string;
  lesson_id: string;
  position: number;
  kind: string;
  title: string;
  config: unknown;
};

function mapLesson(
  row: LessonRow,
  steps: ClassLesson["steps"],
): ClassLesson {
  return {
    id: row.id,
    classId: row.class_id,
    teacherId: row.teacher_id,
    title: normalizeClassLessonTitle(row.title),
    status: normalizeClassLessonStatus(row.status),
    notes: normalizeClassLessonNotes(row.notes),
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    steps,
  };
}

export const listClassLessonsForClass = cache(async function listClassLessonsForClass(
  classId: string,
): Promise<ClassLessonSummary[]> {
  noStore();
  await requireTeacherUserId();
  const supabase = await createClient();

  const { data: lessons, error } = await supabase
    .from("class_lessons")
    .select("id, class_id, title, status, notes, published_at, updated_at")
    .eq("class_id", classId)
    .neq("status", "archived")
    .order("updated_at", { ascending: false });

  if (error) {
    if (isMissingClassLessonsTable(error)) return [];
    throw error;
  }
  const rows = (lessons ?? []) as Array<{
    id: string;
    class_id: string;
    title: string;
    status: string;
    notes: string;
    published_at: string | null;
    updated_at: string;
  }>;
  if (!rows.length) return [];

  const lessonIds = rows.map((row) => row.id);
  const { data: steps, error: stepsError } = await supabase
    .from("class_lesson_steps")
    .select("lesson_id")
    .in("lesson_id", lessonIds);

  if (stepsError) {
    if (isMissingClassLessonsTable(stepsError)) return [];
    throw stepsError;
  }

  const counts = new Map<string, number>();
  for (const step of steps ?? []) {
    const lessonId = String((step as { lesson_id: string }).lesson_id);
    counts.set(lessonId, (counts.get(lessonId) ?? 0) + 1);
  }

  return rows.map((row) => ({
    id: row.id,
    classId: row.class_id,
    title: normalizeClassLessonTitle(row.title),
    status: normalizeClassLessonStatus(row.status),
    notes: normalizeClassLessonNotes(row.notes),
    publishedAt: row.published_at,
    stepCount: counts.get(row.id) ?? 0,
    updatedAt: row.updated_at,
  }));
});

/** Published lesson materials visible to an enrolled student for one class. */
export async function listPublishedClassMaterialsForStudentClass(
  classId: string,
  limit = 20,
): Promise<StudentClassMaterial[]> {
  noStore();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id || !isStudent(user)) {
    return [];
  }

  const { data: lessons, error } = await supabase
    .from("class_lessons")
    .select("id, class_id, title, published_at")
    .eq("class_id", classId)
    .not("published_at", "is", null)
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error) {
    if (isMissingClassLessonsTable(error)) return [];
    throw error;
  }

  const rows = (lessons ?? []) as Array<{
    id: string;
    class_id: string;
    title: string;
    published_at: string;
  }>;
  if (!rows.length) return [];

  const lessonIds = rows.map((row) => row.id);
  const { data: steps, error: stepsError } = await supabase
    .from("class_lesson_steps")
    .select("lesson_id, position, kind, title")
    .in("lesson_id", lessonIds)
    .order("position", { ascending: true });

  if (stepsError) {
    if (isMissingClassLessonsTable(stepsError)) return [];
    throw stepsError;
  }

  const stepsByLesson = new Map<string, StudentClassMaterial["steps"]>();
  for (const row of steps ?? []) {
    const kind = isClassLessonStepKind((row as { kind: string }).kind)
      ? (row as { kind: ClassLessonStepKind }).kind
      : null;
    if (!kind) continue;
    const lessonId = String((row as { lesson_id: string }).lesson_id);
    const list = stepsByLesson.get(lessonId) ?? [];
    list.push({
      position: Number((row as { position: number }).position),
      kind,
      title: String((row as { title: string }).title),
    });
    stepsByLesson.set(lessonId, list);
  }

  return rows.map((row) => ({
    id: row.id,
    classId: row.class_id,
    title: normalizeClassLessonTitle(row.title),
    publishedAt: row.published_at,
    steps: stepsByLesson.get(row.id) ?? [],
  }));
}

export async function getClassLesson(lessonId: string): Promise<ClassLesson | null> {
  noStore();
  await requireTeacherUserId();
  const supabase = await createClient();

  const { data: lesson, error } = await supabase
    .from("class_lessons")
    .select("*")
    .eq("id", lessonId)
    .maybeSingle();

  if (error) {
    if (isMissingClassLessonsTable(error)) return null;
    throw error;
  }
  if (!lesson) return null;

  const { data: steps, error: stepsError } = await supabase
    .from("class_lesson_steps")
    .select("id, lesson_id, position, kind, title, config")
    .eq("lesson_id", lessonId)
    .order("position", { ascending: true });

  if (stepsError) {
    if (isMissingClassLessonsTable(stepsError)) return null;
    throw stepsError;
  }

  const mappedSteps = ((steps ?? []) as StepRow[])
    .map((row) => mapDbStepRow(row))
    .filter((row): row is NonNullable<typeof row> => Boolean(row));

  return mapLesson(lesson as LessonRow, mappedSteps);
}

/** Validates a Ready lesson owned by the teacher for the given class. */
export async function getReadyClassLessonForClass(input: {
  lessonId: string;
  classId: string;
}): Promise<ClassLesson | null> {
  const lesson = await getClassLesson(input.lessonId);
  if (!lesson) return null;
  if (lesson.classId !== input.classId) return null;
  if (lesson.status !== "ready") return null;
  if (lesson.steps.length === 0) return null;
  return lesson;
}

export async function listClassLessonsWithStepsForClass(
  classId: string,
): Promise<ClassLesson[]> {
  noStore();
  await requireTeacherUserId();
  const supabase = await createClient();

  const { data: lessons, error } = await supabase
    .from("class_lessons")
    .select("*")
    .eq("class_id", classId)
    .neq("status", "archived")
    .order("updated_at", { ascending: false });

  if (error) {
    if (isMissingClassLessonsTable(error)) return [];
    throw error;
  }
  const rows = (lessons ?? []) as LessonRow[];
  if (!rows.length) return [];

  const lessonIds = rows.map((row) => row.id);
  const { data: steps, error: stepsError } = await supabase
    .from("class_lesson_steps")
    .select("id, lesson_id, position, kind, title, config")
    .in("lesson_id", lessonIds)
    .order("position", { ascending: true });

  if (stepsError) {
    if (isMissingClassLessonsTable(stepsError)) return [];
    throw stepsError;
  }

  const stepsByLesson = new Map<string, ClassLesson["steps"]>();
  for (const row of (steps ?? []) as StepRow[]) {
    const mapped = mapDbStepRow(row);
    if (!mapped) continue;
    const list = stepsByLesson.get(row.lesson_id) ?? [];
    list.push(mapped);
    stepsByLesson.set(row.lesson_id, list);
  }

  return rows.map((row) => mapLesson(row, stepsByLesson.get(row.id) ?? []));
}
