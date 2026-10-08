"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isTeacher } from "@/lib/auth/roles";
import { getClassLesson } from "@/lib/data/class-lessons";
import { getLessonRelease } from "@/lib/data/lesson-releases";
import { getStudioActivityForTeacher } from "@/lib/studio-activities/load";
import { lessonReadiness, stepPlanning, type LessonReadiness } from "@/lib/class-lessons/planning";
import { homeworkFromReleasedStep, releasedPlayPath, validateLessonMaterial } from "@/lib/class-lessons/release";
import type { ClassLesson, StudioActivityLessonStepConfig } from "@/lib/class-lessons/types";
import { isUuid } from "@/lib/class-lessons/vocabulary";

export type LessonDeliveryReview = { readiness: LessonReadiness; lessonUpdatedAt: string; materialRevisions: Record<string, string> };
type Result<T> = { ok: true } & T | { ok: false; error: string };
async function teacherClient() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isTeacher(user)) throw new Error("Teacher authentication required.");
  return { supabase, teacherId: user.id };
}
function failure(error: unknown): { ok: false; error: string } {
  return { ok: false, error: error instanceof Error ? error.message : "Could not prepare lesson delivery." };
}
function revalidateClass(id: string) {
  revalidatePath(`/teacher/classes/${id}`);
  revalidatePath(`/primary/class/${id}`);
  revalidatePath(`/secondary/class/${id}`);
}

export async function reviewClassLessonDelivery(input: { lessonId: string; expectedUpdatedAt: string }): Promise<Result<{ review: LessonDeliveryReview }>> {
  try {
    const { supabase, teacherId } = await teacherClient();
    const lesson = await getClassLesson(input.lessonId);
    if (!lesson || lesson.teacherId !== teacherId || lesson.status === "archived") throw new Error("Lesson not found or cannot be reviewed.");
    if (lesson.updatedAt !== input.expectedUpdatedAt) throw new Error("Lesson changed. Save and review it again.");
    const readiness = lessonReadiness(lesson);
    const materialRevisions: Record<string, string> = {};
    // Deduplicate shared Bank sources; every referring step gets its own diagnostic.
    const ids = [...new Set(lesson.steps.filter((step) => step.kind === "studio_activity").map((step) => (step.config as StudioActivityLessonStepConfig).activityId))];
    const materials = await Promise.all(ids.map(async (id) => ({ id, activity: await getStudioActivityForTeacher(supabase, teacherId, id) })));
    for (const { id, activity } of materials) {
      for (const step of lesson.steps.filter((step) => step.kind === "studio_activity" && (step.config as StudioActivityLessonStepConfig).activityId === id)) {
        const result = readiness.steps.find((row) => row.stepId === step.id)!;
        try {
          if (!activity || activity.format !== (step.config as StudioActivityLessonStepConfig).format) throw new Error("Material was deleted, changed format, or is unavailable.");
          validateLessonMaterial(activity.format, activity.pack);
          materialRevisions[id] = activity.updated_at;
        } catch (error) { result.ready = false; result.issues.push(error instanceof Error ? error.message : "Material cannot be played."); }
      }
    }
    readiness.ready = readiness.issues.length === 0 && readiness.steps.every((row) => row.ready);
    return { ok: true, review: { readiness, lessonUpdatedAt: lesson.updatedAt, materialRevisions } };
  } catch (error) { return failure(error); }
}

/** Called only after the teacher previews and confirms the saved review. */
export async function releaseClassLessonDelivery(input: { lessonId: string; expectedUpdatedAt: string; materialRevisions: Record<string, string> }): Promise<Result<{ lesson: ClassLesson }>> {
  try {
    const { supabase } = await teacherClient();
    if (!isUuid(input.lessonId) || !input.expectedUpdatedAt || !input.materialRevisions || typeof input.materialRevisions !== "object") throw new Error("Review the lesson before releasing.");
    // Revalidate on the server. PostgreSQL locks/checks the exact reviewed revisions
    // again and constructs snapshots from owned rows, never client-supplied packs.
    const checked = await reviewClassLessonDelivery({ lessonId: input.lessonId, expectedUpdatedAt: input.expectedUpdatedAt });
    if (!checked.ok) throw new Error(checked.error);
    if (!checked.review.readiness.ready) throw new Error("Resolve the preparation issues before releasing.");
    const { error } = await supabase.rpc("release_class_lesson_plan", { p_lesson_id: input.lessonId, p_expected_updated_at: input.expectedUpdatedAt, p_material_revisions: input.materialRevisions });
    if (error) throw new Error(error.message);
    const lesson = await getClassLesson(input.lessonId);
    if (!lesson) throw new Error("Lesson released but could not be loaded. Reopen the planner.");
    revalidateClass(lesson.classId);
    return { ok: true, lesson };
  } catch (error) { return failure(error); }
}

export async function getReleasedLessonHomework(releaseId: string): Promise<Result<{ steps: { id: string; title: string; minutes: number; instructions: string; previewPath: string | null }[] }>> {
  try {
    await teacherClient();
    const release = await getLessonRelease(releaseId);
    if (!release) throw new Error("Released lesson not found.");
    const steps = release.snapshot.lesson.steps.filter((step) => stepPlanning(step).delivery === "homework").map((step) => {
      const prepared = homeworkFromReleasedStep(release, step);
      const material = release.snapshot.materials[step.id];
      return { id: step.id, title: step.title, minutes: step.durationMinutes, instructions: prepared.instructions, previewPath: material ? releasedPlayPath(release.id, step.id) : null };
    });
    return { ok: true, steps };
  } catch (error) { return failure(error); }
}

export async function assignReleasedLessonHomework(input: { releaseId: string; stepId: string; dueAt?: string | null }): Promise<Result<{ homeworkId: string }>> {
  try {
    const { supabase } = await teacherClient();
    if (!isUuid(input.releaseId) || !isUuid(input.stepId)) throw new Error("Choose a released homework step.");
    const release = await getLessonRelease(input.releaseId);
    const step = release?.snapshot.lesson.steps.find((step) => step.id === input.stepId);
    if (!release || !step) throw new Error("Released homework step not found.");
    homeworkFromReleasedStep(release, step);
    const due = input.dueAt ? new Date(input.dueAt) : null;
    if (due && !Number.isFinite(due.getTime())) throw new Error("Choose a valid due date.");
    const { data, error } = await supabase.rpc("assign_released_lesson_homework", { p_release_id: input.releaseId, p_step_id: input.stepId, p_due_at: due?.toISOString() ?? null });
    if (error) throw new Error(error.message);
    if (typeof data !== "string") throw new Error("Homework could not be loaded. Retry this assignment.");
    revalidateClass(release.classId);
    return { ok: true, homeworkId: data };
  } catch (error) { return failure(error); }
}
