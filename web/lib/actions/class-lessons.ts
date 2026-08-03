"use server";

import { revalidatePath } from "next/cache";
import { isTeacher } from "@/lib/auth/roles";
import {
  normalizeClassLessonDuration,
  normalizeClassLessonNotes,
  normalizeClassLessonObjective,
  normalizeClassLessonStatus,
  normalizeClassLessonStepInputs,
  normalizeClassLessonSuccessCheck,
  normalizeClassLessonTargetLanguage,
  normalizeClassLessonTitle,
} from "@/lib/class-lessons/normalize";
import type { ClassLesson, ClassLessonStatus } from "@/lib/class-lessons/types";
import { getClassLessonTemplate } from "@/lib/class-lessons/templates";
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
  templateKey?: string;
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

    const template = getClassLessonTemplate(input.templateKey);
    const title = normalizeClassLessonTitle(input.title, template.title);
    const steps = normalizeClassLessonStepInputs(template.steps);
    const { data, error } = await supabase.rpc("create_class_lesson_plan", {
      p_class_id: classId,
      p_title: title,
      p_objective: normalizeClassLessonObjective(template.objective),
      p_duration_minutes: normalizeClassLessonDuration(template.durationMinutes),
      p_target_language: normalizeClassLessonTargetLanguage(template.targetLanguage),
      p_success_check: normalizeClassLessonSuccessCheck(template.successCheck),
      p_template_key: template.key,
      p_template_version: template.version,
      p_steps: steps,
    });

    const lessonId = typeof data === "string" ? data : null;
    if (error || !lessonId) {
      return { ok: false, error: error?.message ?? "Could not create lesson." };
    }

    const lesson = await getClassLesson(lessonId);
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
  objective?: string;
  durationMinutes?: number;
  targetLanguage?: string;
  successCheck?: string;
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
    const objective = normalizeClassLessonObjective(input.objective);
    const durationMinutes = normalizeClassLessonDuration(input.durationMinutes);
    const targetLanguage = normalizeClassLessonTargetLanguage(input.targetLanguage);
    const successCheck = normalizeClassLessonSuccessCheck(input.successCheck);
    const status = normalizeClassLessonStatus(input.status ?? existing.status);
    if (status === "archived") {
      return { ok: false, error: "Use archive to archive a lesson." };
    }

    const steps = normalizeClassLessonStepInputs(input.steps);
    if (status === "ready" && steps.length === 0) {
      return { ok: false, error: "Add at least one step before marking Ready." };
    }
    const objectiveIsStarter =
      objective === "Students will be able to…" ||
      objective === "Students will be able to understand and respond to…" ||
      objective === "Students will be able to retrieve and apply…";
    if (status === "ready" && (!objective || objectiveIsStarter)) {
      return { ok: false, error: "Add a learning goal before marking Ready." };
    }

    const { error: updateError } = await supabase.rpc("save_class_lesson_plan", {
      p_lesson_id: lessonId,
      p_title: title,
      p_notes: notes,
      p_status: status,
      p_objective: objective,
      p_duration_minutes: durationMinutes,
      p_target_language: targetLanguage,
      p_success_check: successCheck,
      p_steps: steps,
    });

    if (updateError) return { ok: false, error: updateError.message };

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

export async function duplicateClassLesson(
  lessonId: string,
): Promise<ClassLessonActionResult> {
  try {
    const teacherId = await requireTeacherUserId();
    const id = lessonId.trim();
    if (!id) return { ok: false, error: "Missing lesson." };

    const source = await getClassLesson(id);
    if (!source || source.teacherId !== teacherId) {
      return { ok: false, error: "Lesson not found." };
    }

    const supabase = await createClient();
    const { data, error } = await supabase.rpc("create_class_lesson_plan", {
      p_class_id: source.classId,
      p_title: normalizeClassLessonTitle(`${source.title} (copy)`),
      p_objective: source.objective,
      p_duration_minutes: source.durationMinutes,
      p_target_language: source.targetLanguage,
      p_success_check: source.successCheck,
      p_template_key: source.templateKey ?? "blank",
      p_template_version: source.templateVersion ?? 1,
      p_steps: source.steps,
    });

    const duplicatedId = typeof data === "string" ? data : null;
    if (error || !duplicatedId) {
      return { ok: false, error: error?.message ?? "Could not duplicate lesson." };
    }

    const lesson = await getClassLesson(duplicatedId);
    if (!lesson) {
      return { ok: false, error: "Lesson duplicated but could not be loaded." };
    }

    revalidateClass(source.classId);
    return { ok: true, lesson };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Could not duplicate lesson.",
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
