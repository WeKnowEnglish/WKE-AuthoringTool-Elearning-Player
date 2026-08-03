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
  objective: string;
  duration_minutes: number;
  target_language: string;
  success_check: string;
  template_key: string | null;
  template_version: number | null;
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
  phase: string;
  duration_minutes: number;
  teacher_action: string;
  student_action: string;
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
    objective: typeof row.objective === "string" ? row.objective : "",
    durationMinutes:
      typeof row.duration_minutes === "number" ? row.duration_minutes : 45,
    targetLanguage:
      typeof row.target_language === "string" ? row.target_language : "",
    successCheck:
      typeof row.success_check === "string" ? row.success_check : "",
    templateKey: row.template_key ?? null,
    templateVersion: row.template_version ?? null,
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

  const { data, error } = await supabase.rpc("list_published_class_materials", {
    p_class_id: classId,
    p_limit: limit,
  });

  if (error) {
    if (isMissingClassLessonsTable(error)) return [];
    throw error;
  }

  const rows = (data ?? []) as Array<{
    lesson_id: string;
    class_id: string;
    lesson_title: string;
    published_at: string;
    step_id: string | null;
    step_position: number | null;
    step_kind: string | null;
    step_title: string | null;
    step_phase: string | null;
    step_duration_minutes: number | null;
    step_student_action: string | null;
  }>;
  if (!rows.length) return [];

  const lessonById = new Map<string, StudentClassMaterial>();
  const stepsByLesson = new Map<string, StudentClassMaterial["steps"]>();
  for (const row of rows) {
    if (!lessonById.has(row.lesson_id)) {
      lessonById.set(row.lesson_id, {
        id: row.lesson_id,
        classId: row.class_id,
        title: normalizeClassLessonTitle(row.lesson_title),
        publishedAt: row.published_at,
        steps: [],
      });
    }
    const kind = isClassLessonStepKind(row.step_kind)
      ? (row.step_kind as ClassLessonStepKind)
      : null;
    if (!kind || !row.step_id || row.step_position == null || !row.step_title) continue;
    const list = stepsByLesson.get(row.lesson_id) ?? [];
    list.push({
      position: row.step_position,
      kind,
      title: row.step_title,
      phase: (row.step_phase ?? "custom") as StudentClassMaterial["steps"][number]["phase"],
      durationMinutes: row.step_duration_minutes ?? 5,
      studentAction: row.step_student_action ?? "",
    });
    stepsByLesson.set(row.lesson_id, list);
  }

  return [...lessonById.values()].map((lesson) => ({
    ...lesson,
    steps: stepsByLesson.get(lesson.id) ?? [],
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
    .select("id, lesson_id, position, kind, title, phase, duration_minutes, teacher_action, student_action, config")
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
    .select("id, lesson_id, position, kind, title, phase, duration_minutes, teacher_action, student_action, config")
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
