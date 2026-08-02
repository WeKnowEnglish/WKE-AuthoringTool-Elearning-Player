import { unstable_noStore as noStore } from "next/cache";
import { isTeacher } from "@/lib/auth/roles";
import { normalizeHomeworkTemplateSubmissionContent, type HomeworkTemplateSubmission } from "@/lib/homework-templates/homework-template-submission";
import { createClient } from "@/lib/supabase/server";

export type TeacherHomeworkTemplateSubmission = HomeworkTemplateSubmission & { displayName: string };

export async function listHomeworkTemplateSubmissionsForTeacher(input: { classId: string; homeworkId: string }): Promise<TeacherHomeworkTemplateSubmission[]> {
  noStore();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id || !isTeacher(user)) throw new Error("Teacher authentication required.");
  const { data: homework } = await supabase.from("class_homework").select("id").eq("id", input.homeworkId).eq("class_id", input.classId).eq("teacher_id", user.id).maybeSingle();
  if (!homework) return [];
  const { data, error } = await supabase.from("homework_template_submissions").select("id, homework_id, student_id, status, content, submitted_at, updated_at").eq("homework_id", input.homeworkId).order("updated_at", { ascending: false });
  if (error) {
    if (/homework_template_submissions|schema cache|does not exist/i.test(error.message)) return [];
    throw error;
  }
  const studentIds = (data ?? []).map((row) => String(row.student_id));
  const { data: profiles } = studentIds.length ? await supabase.from("student_profiles").select("user_id, display_name").in("user_id", studentIds) : { data: [] };
  const names = new Map((profiles ?? []).map((row) => [String(row.user_id), String(row.display_name)]));
  return (data ?? []).map((row) => ({
    id: String(row.id), homeworkId: String(row.homework_id), studentId: String(row.student_id),
    displayName: names.get(String(row.student_id)) ?? "Student",
    status: row.status === "submitted" ? "submitted" : "in_progress",
    content: normalizeHomeworkTemplateSubmissionContent(row.content),
    submittedAt: typeof row.submitted_at === "string" ? row.submitted_at : null,
    updatedAt: String(row.updated_at),
  }));
}
