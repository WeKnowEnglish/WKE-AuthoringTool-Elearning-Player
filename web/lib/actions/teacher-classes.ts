"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isTeacher } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

export type TeacherClassActionResult =
  | { ok: true }
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

export async function createTeacherClass(formData: FormData): Promise<void> {
  const teacherId = await requireTeacherUserId();
  const title = String(formData.get("title") ?? "").trim();
  if (!title) {
    redirect("/teacher/classes/new?error=missing_title");
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("teacher_classes")
    .insert({
      teacher_id: teacherId,
      title,
      course_id: null,
    })
    .select("id")
    .single();

  if (error || !data?.id) {
    redirect("/teacher/classes/new?error=create_failed");
  }

  revalidatePath("/teacher/classes");
  redirect(`/teacher/classes/${data.id}`);
}

export async function regenerateClassJoinCode(classId: string): Promise<TeacherClassActionResult> {
  await requireTeacherUserId();
  const supabase = await createClient();

  const { data: code, error: codeError } = await supabase.rpc("generate_class_join_code");
  if (codeError || typeof code !== "string") {
    return { ok: false, error: codeError?.message ?? "Could not generate a new code." };
  }

  const { error } = await supabase
    .from("teacher_classes")
    .update({ join_code: code, updated_at: new Date().toISOString() })
    .eq("id", classId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/teacher/classes");
  revalidatePath(`/teacher/classes/${classId}`);
  return { ok: true };
}

export async function archiveTeacherClass(classId: string): Promise<TeacherClassActionResult> {
  await requireTeacherUserId();
  const supabase = await createClient();

  const { error } = await supabase
    .from("teacher_classes")
    .update({
      archived_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", classId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/teacher/classes");
  revalidatePath(`/teacher/classes/${classId}`);
  return { ok: true };
}

export async function removeStudentFromClass(
  classId: string,
  studentId: string,
): Promise<TeacherClassActionResult> {
  await requireTeacherUserId();
  const supabase = await createClient();

  const { error } = await supabase
    .from("class_enrollments")
    .delete()
    .eq("class_id", classId)
    .eq("student_id", studentId);

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/teacher/classes/${classId}`);
  revalidatePath("/teacher/classes");
  return { ok: true };
}
