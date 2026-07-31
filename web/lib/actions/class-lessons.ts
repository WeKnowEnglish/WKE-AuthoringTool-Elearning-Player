"use server";

import { revalidatePath } from "next/cache";
import { isTeacher } from "@/lib/auth/roles";
import {
  normalizeClassLessonNotes,
  normalizeClassLessonStatus,
  normalizeClassLessonStepInputs,
  normalizeClassLessonTitle,
} from "@/lib/class-lessons/normalize";
import type { ClassLesson, ClassLessonStatus } from "@/lib/class-lessons/types";
import { getClassLesson } from "@/lib/data/class-lessons";
import { createClient } from "@/lib/supabase/server";

export type ClassLessonActionResult =
  | { ok: true; lesson: ClassLesson }
  | { ok: false; error: string };

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

function revalidateClass(classId: string) {
  revalidatePath(`/teacher/classes/${classId}`);
  revalidatePath(`/primary/class/${classId}`);
  revalidatePath(`/secondary/class/${classId}`);
}

export async function createClassLesson(input: {
  classId: string;
  title?: string;
}): Promise<ClassLessonActionResult> {
  try {
    const teacherId = await requireTeacherUserId();
    const classId = input.classId.trim();
    if (!classId) return { ok: false, error: "Missing class." };

    const supabase = await createClient();
    const { data: ownedClass, error: classError } = await supabase
      .from("teacher_classes")
      .select("id")
      .eq("id", classId)
      .eq("teacher_id", teacherId)
      .maybeSingle();

    if (classError) return { ok: false, error: classError.message };
    if (!ownedClass) return { ok: false, error: "Class not found." };

    const title = normalizeClassLessonTitle(input.title, "Untitled lesson");
    const { data, error } = await supabase
      .from("class_lessons")
      .insert({
        class_id: classId,
        teacher_id: teacherId,
        title,
        status: "draft",
        notes: "",
      })
      .select("id")
      .single();

    if (error || !data?.id) {
      return { ok: false, error: error?.message ?? "Could not create lesson." };
    }

    const lesson = await getClassLesson(data.id);
    if (!lesson) return { ok: false, error: "Lesson created but could not be loaded." };

    revalidateClass(classId);
    return { ok: true, lesson };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Could not create lesson.",
    };
  }
}

export async function saveClassLesson(input: {
  lessonId: string;
  title: string;
  notes?: string;
  status?: ClassLessonStatus;
  steps: unknown;
}): Promise<ClassLessonActionResult> {
  try {
    const teacherId = await requireTeacherUserId();
    const lessonId = input.lessonId.trim();
    if (!lessonId) return { ok: false, error: "Missing lesson." };

    const supabase = await createClient();
    const { data: existing, error: existingError } = await supabase
      .from("class_lessons")
      .select("id, class_id, teacher_id, status")
      .eq("id", lessonId)
      .eq("teacher_id", teacherId)
      .maybeSingle();

    if (existingError) return { ok: false, error: existingError.message };
    if (!existing) return { ok: false, error: "Lesson not found." };
    if (existing.status === "archived") {
      return { ok: false, error: "Archived lessons cannot be edited." };
    }

    const title = normalizeClassLessonTitle(input.title);
    const notes = normalizeClassLessonNotes(input.notes);
    const status = normalizeClassLessonStatus(input.status ?? existing.status);
    if (status === "archived") {
      return { ok: false, error: "Use archive to archive a lesson." };
    }

    const steps = normalizeClassLessonStepInputs(input.steps);
    if (status === "ready" && steps.length === 0) {
      return { ok: false, error: "Add at least one step before marking Ready." };
    }

    const { error: updateError } = await supabase
      .from("class_lessons")
      .update({
        title,
        notes,
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", lessonId)
      .eq("teacher_id", teacherId);

    if (updateError) return { ok: false, error: updateError.message };

    const { error: deleteError } = await supabase
      .from("class_lesson_steps")
      .delete()
      .eq("lesson_id", lessonId);

    if (deleteError) return { ok: false, error: deleteError.message };

    if (steps.length > 0) {
      const rows = steps.map((step, index) => ({
        ...(step.id ? { id: step.id } : {}),
        lesson_id: lessonId,
        position: index,
        kind: step.kind,
        title: step.title,
        config: step.config,
      }));

      const { error: insertError } = await supabase.from("class_lesson_steps").insert(rows);
      if (insertError) return { ok: false, error: insertError.message };
    }

    const lesson = await getClassLesson(lessonId);
    if (!lesson) return { ok: false, error: "Lesson saved but could not be loaded." };

    revalidateClass(String(existing.class_id));
    return { ok: true, lesson };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Could not save lesson.",
    };
  }
}

export async function archiveClassLesson(lessonId: string): Promise<ClassLessonActionResult> {
  try {
    const teacherId = await requireTeacherUserId();
    const id = lessonId.trim();
    if (!id) return { ok: false, error: "Missing lesson." };

    const supabase = await createClient();
    const { data: existing, error: existingError } = await supabase
      .from("class_lessons")
      .select("id, class_id")
      .eq("id", id)
      .eq("teacher_id", teacherId)
      .maybeSingle();

    if (existingError) return { ok: false, error: existingError.message };
    if (!existing) return { ok: false, error: "Lesson not found." };

    const { error } = await supabase
      .from("class_lessons")
      .update({
        status: "archived",
        published_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("teacher_id", teacherId);

    if (error) return { ok: false, error: error.message };

    const lesson = await getClassLesson(id);
    if (!lesson) return { ok: false, error: "Lesson archived." };

    revalidateClass(String(existing.class_id));
    return { ok: true, lesson };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Could not archive lesson.",
    };
  }
}

export async function publishClassLessonToClassroom(
  lessonId: string,
): Promise<ClassLessonActionResult> {
  try {
    const teacherId = await requireTeacherUserId();
    const id = lessonId.trim();
    if (!id) return { ok: false, error: "Missing lesson." };

    const lesson = await getClassLesson(id);
    if (!lesson) return { ok: false, error: "Lesson not found." };
    if (lesson.teacherId !== teacherId) return { ok: false, error: "Lesson not found." };
    if (lesson.status !== "ready") {
      return { ok: false, error: "Mark the lesson Ready before sharing with students." };
    }
    if (lesson.steps.length === 0) {
      return { ok: false, error: "Add at least one step before sharing." };
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from("class_lessons")
      .update({
        published_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("teacher_id", teacherId);

    if (error) return { ok: false, error: error.message };

    const updated = await getClassLesson(id);
    if (!updated) return { ok: false, error: "Lesson published but could not be loaded." };

    revalidateClass(updated.classId);
    return { ok: true, lesson: updated };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Could not publish lesson.",
    };
  }
}

export async function unpublishClassLessonFromClassroom(
  lessonId: string,
): Promise<ClassLessonActionResult> {
  try {
    const teacherId = await requireTeacherUserId();
    const id = lessonId.trim();
    if (!id) return { ok: false, error: "Missing lesson." };

    const supabase = await createClient();
    const { data: existing, error: existingError } = await supabase
      .from("class_lessons")
      .select("id, class_id")
      .eq("id", id)
      .eq("teacher_id", teacherId)
      .maybeSingle();

    if (existingError) return { ok: false, error: existingError.message };
    if (!existing) return { ok: false, error: "Lesson not found." };

    const { error } = await supabase
      .from("class_lessons")
      .update({
        published_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("teacher_id", teacherId);

    if (error) return { ok: false, error: error.message };

    const lesson = await getClassLesson(id);
    if (!lesson) return { ok: false, error: "Lesson unpublished." };

    revalidateClass(String(existing.class_id));
    return { ok: true, lesson };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Could not unpublish lesson.",
    };
  }
}
