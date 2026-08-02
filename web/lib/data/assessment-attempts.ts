import { unstable_noStore as noStore } from "next/cache";
import { isStudent, isTeacher } from "@/lib/auth/roles";
import { assessmentProgress, PRIMARY_A2_ASSESSMENT_PILOT, sanitizeAssessmentResponses, type AssessmentAttempt, type AssessmentSpeakingRecording } from "@/lib/assessment";
import { createClient } from "@/lib/supabase/server";

export async function getMyAssessmentAttempt(homeworkId: string): Promise<AssessmentAttempt | null> {
  noStore();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id || !isStudent(user)) return null;
  const { data, error } = await supabase.from("class_assessment_attempts")
    .select("id, status, active_part_id, responses, started_at, updated_at, submitted_at")
    .eq("homework_id", homeworkId).eq("student_id", user.id).maybeSingle();
  if (error || !data) return null;
  return {
    schemaVersion: 1,
    attemptId: String(data.id),
    definitionId: PRIMARY_A2_ASSESSMENT_PILOT.id,
    contentVersion: PRIMARY_A2_ASSESSMENT_PILOT.contentVersion,
    status: data.status === "submitted" ? "submitted" : "in_progress",
    activePartId: String(data.active_part_id),
    responses: sanitizeAssessmentResponses(PRIMARY_A2_ASSESSMENT_PILOT, data.responses),
    startedAt: typeof data.started_at === "string" ? data.started_at : null,
    updatedAt: String(data.updated_at),
    submittedAt: typeof data.submitted_at === "string" ? data.submitted_at : null,
  };
}

async function signedRecording(supabase: Awaited<ReturnType<typeof createClient>>, row: { id: unknown; part_id: unknown; response_id: unknown; duration_ms: unknown; storage_path: unknown }): Promise<AssessmentSpeakingRecording> {
  const { data } = await supabase.storage.from("voice_submissions").createSignedUrl(String(row.storage_path), 60 * 60);
  return { id: String(row.id), partId: String(row.part_id), responseId: String(row.response_id), durationMs: Number(row.duration_ms), url: data?.signedUrl ?? "" };
}

export async function getMyAssessmentSpeakingRecordings(homeworkId: string): Promise<AssessmentSpeakingRecording[]> {
  noStore();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id || !isStudent(user)) return [];
  const { data, error } = await supabase.from("assessment_speaking_recordings")
    .select("id, part_id, response_id, duration_ms, storage_path")
    .eq("homework_id", homeworkId).eq("student_id", user.id);
  if (error) {
    if (/assessment_speaking_recordings|schema cache|does not exist/i.test(error.message)) return [];
    throw error;
  }
  return Promise.all((data ?? []).map((row) => signedRecording(supabase, row)));
}

export type TeacherAssessmentAttemptSummary = {
  studentId: string;
  displayName: string;
  status: "not_started" | "in_progress" | "submitted";
  answered: number;
  correct: number;
  itemTotal: number;
  objectiveTotal: number;
  recordings: AssessmentSpeakingRecording[];
  updatedAt: string | null;
  submittedAt: string | null;
};

export async function listAssessmentResultsForTeacher(input: { classId: string; homeworkId: string }): Promise<TeacherAssessmentAttemptSummary[]> {
  noStore();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id || !isTeacher(user)) throw new Error("Teacher authentication required.");
  const { data: homework } = await supabase.from("class_homework").select("id").eq("id", input.homeworkId).eq("class_id", input.classId).eq("teacher_id", user.id).maybeSingle();
  if (!homework) return [];
  const { data: enrollments, error: enrollmentError } = await supabase.from("class_enrollments").select("student_id").eq("class_id", input.classId);
  if (enrollmentError) throw enrollmentError;
  const ids = (enrollments ?? []).map((row) => String(row.student_id));
  if (!ids.length) return [];
  const [{ data: profiles }, { data: attempts, error: attemptsError }, { data: recordings, error: recordingsError }] = await Promise.all([
    supabase.from("student_profiles").select("user_id, display_name").in("user_id", ids),
    supabase.from("class_assessment_attempts").select("student_id, status, answered_count, objective_correct, objective_total, updated_at, submitted_at").eq("homework_id", input.homeworkId),
    supabase.from("assessment_speaking_recordings").select("id, student_id, part_id, response_id, duration_ms, storage_path").eq("homework_id", input.homeworkId),
  ]);
  if (attemptsError && !/class_assessment_attempts|schema cache|does not exist/i.test(attemptsError.message)) throw attemptsError;
  if (recordingsError && !/assessment_speaking_recordings|schema cache|does not exist/i.test(recordingsError.message)) throw recordingsError;
  const names = new Map((profiles ?? []).map((row) => [String(row.user_id), String(row.display_name)]));
  const byStudent = new Map((attempts ?? []).map((row) => [String(row.student_id), row]));
  const recordingsByStudent = new Map<string, AssessmentSpeakingRecording[]>();
  await Promise.all((recordings ?? []).map(async (row) => {
    const studentId = String(row.student_id);
    const item = await signedRecording(supabase, row);
    recordingsByStudent.set(studentId, [...(recordingsByStudent.get(studentId) ?? []), item]);
  }));
  const itemTotal = assessmentProgress(PRIMARY_A2_ASSESSMENT_PILOT, {}).total;
  return ids.map((studentId) => {
    const row = byStudent.get(studentId);
    return {
      studentId,
      displayName: names.get(studentId) ?? "Student",
      status: row?.status === "submitted" ? "submitted" : row ? "in_progress" : "not_started",
      answered: Number(row?.answered_count ?? 0),
      correct: Number(row?.objective_correct ?? 0),
      itemTotal,
      objectiveTotal: Number(row?.objective_total ?? 0),
      recordings: (recordingsByStudent.get(studentId) ?? []).sort((a, b) => a.partId.localeCompare(b.partId)),
      updatedAt: typeof row?.updated_at === "string" ? row.updated_at : null,
      submittedAt: typeof row?.submitted_at === "string" ? row.submitted_at : null,
    };
  });
}
