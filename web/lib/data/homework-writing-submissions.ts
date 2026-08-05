import { unstable_noStore as noStore } from "next/cache";
import { isStudent, isTeacher } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

export type HomeworkWritingSubmission = {
  id: string;
  homeworkId: string;
  studentId: string;
  status: "in_progress" | "submitted";
  text: string;
  submittedAt: string | null;
  updatedAt: string;
};

export type TeacherHomeworkWritingSubmission = HomeworkWritingSubmission & {
  displayName: string;
};

function normalizeRow(row: {
  id: unknown;
  homework_id: unknown;
  student_id: unknown;
  status: unknown;
  text: unknown;
  submitted_at: unknown;
  updated_at: unknown;
}): HomeworkWritingSubmission {
  return {
    id: String(row.id),
    homeworkId: String(row.homework_id),
    studentId: String(row.student_id),
    status: row.status === "submitted" ? "submitted" : "in_progress",
    text: typeof row.text === "string" ? row.text : "",
    submittedAt: typeof row.submitted_at === "string" ? row.submitted_at : null,
    updatedAt: String(row.updated_at),
  };
}

export async function getMyHomeworkWritingSubmission(
  homeworkId: string,
): Promise<HomeworkWritingSubmission | null> {
  noStore();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id || !isStudent(user)) return null;
  const { data, error } = await supabase
    .from("homework_writing_submissions")
    .select("id, homework_id, student_id, status, text, submitted_at, updated_at")
    .eq("homework_id", homeworkId)
    .eq("student_id", user.id)
    .maybeSingle();
  if (error || !data) return null;
  return normalizeRow(data);
}

export async function listHomeworkWritingSubmissionsForTeacher(input: {
  classId: string;
  homeworkId: string;
}): Promise<TeacherHomeworkWritingSubmission[]> {
  noStore();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id || !isTeacher(user)) throw new Error("Teacher authentication required.");
  const { data: homework } = await supabase
    .from("class_homework")
    .select("id")
    .eq("id", input.homeworkId)
    .eq("class_id", input.classId)
    .eq("teacher_id", user.id)
    .maybeSingle();
  if (!homework) return [];
  const { data, error } = await supabase
    .from("homework_writing_submissions")
    .select("id, homework_id, student_id, status, text, submitted_at, updated_at")
    .eq("homework_id", input.homeworkId)
    .order("updated_at", { ascending: false });
  if (error) {
    if (/homework_writing_submissions|schema cache|does not exist/i.test(error.message)) {
      return [];
    }
    throw error;
  }
  const studentIds = (data ?? []).map((row) => String(row.student_id));
  const { data: profiles } = studentIds.length
    ? await supabase
        .from("student_profiles")
        .select("user_id, display_name")
        .in("user_id", studentIds)
    : { data: [] };
  const names = new Map(
    (profiles ?? []).map((row) => [String(row.user_id), String(row.display_name)]),
  );
  return (data ?? []).map((row) => ({
    ...normalizeRow(row),
    displayName: names.get(String(row.student_id)) ?? "Student",
  }));
}
