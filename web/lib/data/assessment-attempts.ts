import { unstable_noStore as noStore } from "next/cache";
import { isStudent, isTeacher } from "@/lib/auth/roles";
import {
  assessmentProgress,
  PRIMARY_A2_ASSESSMENT_PILOT,
  sanitizeAssessmentResponses,
  type AssessmentAttempt,
  type AssessmentSpeakingRecording,
  type AssessmentSpeakingReview,
} from "@/lib/assessment";
import { normalizeHomeworkPayload } from "@/lib/class-homework/normalize";
import { resolveHomeworkAssessmentDefinition } from "@/lib/class-homework/resolve-assessment-definition";
import { createClient } from "@/lib/supabase/server";

export async function getMyAssessmentAttempt(
  homeworkId: string,
): Promise<AssessmentAttempt | null> {
  noStore();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id || !isStudent(user)) return null;

  const [{ data: homework }, { data, error }] = await Promise.all([
    supabase.from("class_homework").select("payload").eq("id", homeworkId).maybeSingle(),
    supabase
      .from("class_assessment_attempts")
      .select("id, status, active_part_id, responses, started_at, updated_at, submitted_at")
      .eq("homework_id", homeworkId)
      .eq("student_id", user.id)
      .maybeSingle(),
  ]);
  if (error || !data) return null;

  const payload = normalizeHomeworkPayload(homework?.payload);
  const definition =
    payload?.type === "primary_a2_assessment"
      ? resolveHomeworkAssessmentDefinition(payload)
      : PRIMARY_A2_ASSESSMENT_PILOT;

  return {
    schemaVersion: 1,
    attemptId: String(data.id),
    definitionId: definition.id,
    contentVersion: definition.contentVersion,
    status: data.status === "submitted" ? "submitted" : "in_progress",
    activePartId: String(data.active_part_id),
    responses: sanitizeAssessmentResponses(definition, data.responses),
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

function normalizeSpeakingReview(row: { scores: unknown; feedback: unknown; reviewed_at: unknown } | null | undefined): AssessmentSpeakingReview | null {
  if (!row || !row.scores || typeof row.scores !== "object") return null;
  const scores = Object.fromEntries(Object.entries(row.scores as Record<string, unknown>).filter(([, score]) => Number.isFinite(score)).map(([id, score]) => [id, Math.max(0, Math.min(5, Math.round(Number(score))))]));
  return { scores, feedback: typeof row.feedback === "string" ? row.feedback : "", reviewedAt: String(row.reviewed_at) };
}

export async function getMyAssessmentSpeakingReview(homeworkId: string): Promise<AssessmentSpeakingReview | null> {
  noStore();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id || !isStudent(user)) return null;
  const { data, error } = await supabase.from("assessment_speaking_reviews").select("scores, feedback, reviewed_at").eq("homework_id", homeworkId).eq("student_id", user.id).maybeSingle();
  if (error) {
    if (/assessment_speaking_reviews|schema cache|does not exist/i.test(error.message)) return null;
    throw error;
  }
  return normalizeSpeakingReview(data);
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
  speakingReview: AssessmentSpeakingReview | null;
  updatedAt: string | null;
  submittedAt: string | null;
};

export async function listAssessmentResultsForTeacher(input: { classId: string; homeworkId: string }): Promise<TeacherAssessmentAttemptSummary[]> {
  noStore();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id || !isTeacher(user)) throw new Error("Teacher authentication required.");
  const { data: homework } = await supabase
    .from("class_homework")
    .select("id, payload")
    .eq("id", input.homeworkId)
    .eq("class_id", input.classId)
    .eq("teacher_id", user.id)
    .maybeSingle();
  if (!homework) return [];
  const homeworkPayload = normalizeHomeworkPayload(homework.payload);
  const definition =
    homeworkPayload?.type === "primary_a2_assessment"
      ? resolveHomeworkAssessmentDefinition(homeworkPayload)
      : PRIMARY_A2_ASSESSMENT_PILOT;
  const { data: enrollments, error: enrollmentError } = await supabase.from("class_enrollments").select("student_id").eq("class_id", input.classId);
  if (enrollmentError) throw enrollmentError;
  const ids = (enrollments ?? []).map((row) => String(row.student_id));
  if (!ids.length) return [];
  const [{ data: profiles }, { data: attempts, error: attemptsError }, { data: recordings, error: recordingsError }, { data: reviews, error: reviewsError }] = await Promise.all([
    supabase.from("student_profiles").select("user_id, display_name").in("user_id", ids),
    supabase.from("class_assessment_attempts").select("student_id, status, answered_count, objective_correct, objective_total, updated_at, submitted_at").eq("homework_id", input.homeworkId),
    supabase.from("assessment_speaking_recordings").select("id, student_id, part_id, response_id, duration_ms, storage_path").eq("homework_id", input.homeworkId),
    supabase.from("assessment_speaking_reviews").select("student_id, scores, feedback, reviewed_at").eq("homework_id", input.homeworkId),
  ]);
  if (attemptsError && !/class_assessment_attempts|schema cache|does not exist/i.test(attemptsError.message)) throw attemptsError;
  if (recordingsError && !/assessment_speaking_recordings|schema cache|does not exist/i.test(recordingsError.message)) throw recordingsError;
  if (reviewsError && !/assessment_speaking_reviews|schema cache|does not exist/i.test(reviewsError.message)) throw reviewsError;
  const names = new Map((profiles ?? []).map((row) => [String(row.user_id), String(row.display_name)]));
  const byStudent = new Map((attempts ?? []).map((row) => [String(row.student_id), row]));
  const reviewsByStudent = new Map((reviews ?? []).map((row) => [String(row.student_id), normalizeSpeakingReview(row)]));
  const recordingsByStudent = new Map<string, AssessmentSpeakingRecording[]>();
  await Promise.all((recordings ?? []).map(async (row) => {
    const studentId = String(row.student_id);
    const item = await signedRecording(supabase, row);
    recordingsByStudent.set(studentId, [...(recordingsByStudent.get(studentId) ?? []), item]);
  }));
  const itemTotal = assessmentProgress(definition, {}).total;
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
      speakingReview: reviewsByStudent.get(studentId) ?? null,
      updatedAt: typeof row?.updated_at === "string" ? row.updated_at : null,
      submittedAt: typeof row?.submitted_at === "string" ? row.submitted_at : null,
    };
  });
}
