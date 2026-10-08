import "server-only";
import { createClient } from "@/lib/supabase/server";
import { isTeacher } from "@/lib/auth/roles";
import type { LessonRelease } from "@/lib/class-lessons/release";

/** Private teacher-only snapshots include answer keys and teaching cues. */
export async function getLessonRelease(id: string): Promise<LessonRelease | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isTeacher(user)) throw new Error("Teacher authentication required.");
  const { data, error } = await supabase.from("class_lesson_releases").select("*").eq("id", id).eq("teacher_id", user.id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return { id: data.id, lessonId: data.lesson_id, classId: data.class_id, teacherId: data.teacher_id,
    createdAt: data.created_at, sourceUpdatedAt: data.source_updated_at, snapshot: data.snapshot } as LessonRelease;
}
