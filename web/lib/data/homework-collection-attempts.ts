import { unstable_noStore as noStore } from "next/cache";
import { isStudent, isTeacher } from "@/lib/auth/roles";
import {
  homeworkCollectionAttemptFromRow,
  homeworkCollectionReviewFromRow,
  type HomeworkCollectionAttempt,
  type HomeworkCollectionReview,
} from "@/lib/homework-collections";
import { createClient } from "@/lib/supabase/server";

export type TeacherHomeworkCollectionAttempt = HomeworkCollectionAttempt & {
  displayName: string;
  review: HomeworkCollectionReview | null;
};

const ATTEMPT_FIELDS =
  "id, homework_id, student_id, status, content, auto_score, auto_max_score, manual_max_score, submitted_at, updated_at";

export async function getMyHomeworkCollectionAttempt(
  homeworkId: string,
): Promise<HomeworkCollectionAttempt | null> {
  noStore();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id || !isStudent(user)) return null;
  const { data, error } = await supabase
    .from("homework_collection_attempts")
    .select(ATTEMPT_FIELDS)
    .eq("homework_id", homeworkId)
    .eq("student_id", user.id)
    .maybeSingle();
  if (error || !data) return null;
  return homeworkCollectionAttemptFromRow(data as Record<string, unknown>);
}

export async function listHomeworkCollectionAttemptsForTeacher(input: {
  classId: string;
  homeworkId: string;
}): Promise<TeacherHomeworkCollectionAttempt[]> {
  noStore();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
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
    .from("homework_collection_attempts")
    .select(ATTEMPT_FIELDS)
    .eq("homework_id", input.homeworkId)
    .order("updated_at", { ascending: false });
  if (error) {
    if (/homework_collection_attempts|schema cache|does not exist/i.test(error.message)) return [];
    throw error;
  }
  const studentIds = (data ?? []).map((row) => String(row.student_id));
  const [{ data: profiles }, reviewResult] = await Promise.all([
    studentIds.length
      ? supabase.from("student_profiles").select("user_id, display_name").in("user_id", studentIds)
      : Promise.resolve({ data: [] }),
    supabase
      .from("homework_collection_reviews")
      .select("attempt_id, parts, feedback, reviewed_at")
      .eq("homework_id", input.homeworkId),
  ]);
  const names = new Map((profiles ?? []).map((row) => [String(row.user_id), String(row.display_name)]));
  const reviews = new Map(
    (reviewResult.error ? [] : reviewResult.data ?? []).map((row) => [
      String(row.attempt_id),
      homeworkCollectionReviewFromRow(row as Record<string, unknown>),
    ]),
  );
  return (data ?? []).map((row) => {
    const attempt = homeworkCollectionAttemptFromRow(row as Record<string, unknown>);
    return {
      ...attempt,
      displayName: names.get(attempt.studentId) ?? "Student",
      review: reviews.get(attempt.id) ?? null,
    };
  });
}
