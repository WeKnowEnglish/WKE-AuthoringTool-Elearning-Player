import { unstable_noStore as noStore } from "next/cache";
import type { AssessmentSpeakingRecording } from "@/lib/assessment";
import { isStudent, isTeacher } from "@/lib/auth/roles";
import { normalizeHomeworkTemplateSubmissionContent, type HomeworkTemplateSubmission } from "@/lib/homework-templates/homework-template-submission";
import { normalizeHomeworkTemplateGrades, type HomeworkTemplateReview } from "@/lib/homework-templates/homework-template-review";
import { createClient } from "@/lib/supabase/server";

export type TeacherHomeworkTemplateSubmission = HomeworkTemplateSubmission & {
  displayName: string;
  review: HomeworkTemplateReview | null;
  recordings: AssessmentSpeakingRecording[];
};

async function signedRecording(
  supabase: Awaited<ReturnType<typeof createClient>>,
  row: { id: unknown; part_id: unknown; response_id: unknown; duration_ms: unknown; storage_path: unknown },
): Promise<AssessmentSpeakingRecording> {
  const { data } = await supabase.storage
    .from("voice_submissions")
    .createSignedUrl(String(row.storage_path), 60 * 60);
  return {
    id: String(row.id),
    partId: String(row.part_id),
    responseId: String(row.response_id),
    durationMs: Number(row.duration_ms),
    url: data?.signedUrl ?? "",
  };
}

export async function getMyHomeworkTemplateSubmission(
  homeworkId: string,
): Promise<HomeworkTemplateSubmission | null> {
  noStore();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id || !isStudent(user)) return null;
  const { data, error } = await supabase
    .from("homework_template_submissions")
    .select("id, homework_id, student_id, status, content, submitted_at, updated_at")
    .eq("homework_id", homeworkId)
    .eq("student_id", user.id)
    .maybeSingle();
  if (error || !data) return null;
  return {
    id: String(data.id),
    homeworkId: String(data.homework_id),
    studentId: String(data.student_id),
    status: data.status === "submitted" ? "submitted" : "in_progress",
    content: normalizeHomeworkTemplateSubmissionContent(data.content),
    submittedAt: typeof data.submitted_at === "string" ? data.submitted_at : null,
    updatedAt: String(data.updated_at),
  };
}

export async function getMyHomeworkTemplateSpeakingRecordings(
  homeworkId: string,
): Promise<AssessmentSpeakingRecording[]> {
  noStore();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id || !isStudent(user)) return [];
  const { data, error } = await supabase
    .from("homework_template_speaking_recordings")
    .select("id, part_id, response_id, duration_ms, storage_path")
    .eq("homework_id", homeworkId)
    .eq("student_id", user.id);
  if (error) return [];
  return Promise.all((data ?? []).map((row) => signedRecording(supabase, row)));
}

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
  const [{ data: profiles }, reviewResult, recordingResult] = await Promise.all([
    studentIds.length ? supabase.from("student_profiles").select("user_id, display_name").in("user_id", studentIds) : Promise.resolve({ data: [] }),
    supabase.from("homework_template_reviews").select("submission_id, grades, feedback, reviewed_at").eq("homework_id", input.homeworkId),
    supabase.from("homework_template_speaking_recordings").select("id, student_id, part_id, response_id, duration_ms, storage_path").eq("homework_id", input.homeworkId),
  ]);
  const names = new Map((profiles ?? []).map((row) => [String(row.user_id), String(row.display_name)]));
  const reviews = new Map((reviewResult.error ? [] : reviewResult.data ?? []).map((row) => [String(row.submission_id), {
    grades: normalizeHomeworkTemplateGrades(row.grades),
    feedback: typeof row.feedback === "string" ? row.feedback : "",
    reviewedAt: String(row.reviewed_at),
  } satisfies HomeworkTemplateReview]));
  const recordings = new Map<string, AssessmentSpeakingRecording[]>();
  await Promise.all((recordingResult.error ? [] : recordingResult.data ?? []).map(async (row) => {
    const studentId = String(row.student_id);
    const recording = await signedRecording(supabase, row);
    recordings.set(studentId, [...(recordings.get(studentId) ?? []), recording]);
  }));
  return (data ?? []).map((row) => ({
    id: String(row.id), homeworkId: String(row.homework_id), studentId: String(row.student_id),
    displayName: names.get(String(row.student_id)) ?? "Student",
    status: row.status === "submitted" ? "submitted" : "in_progress",
    content: normalizeHomeworkTemplateSubmissionContent(row.content),
    submittedAt: typeof row.submitted_at === "string" ? row.submitted_at : null,
    updatedAt: String(row.updated_at),
    review: reviews.get(String(row.id)) ?? null,
    recordings: recordings.get(String(row.student_id)) ?? [],
  }));
}
