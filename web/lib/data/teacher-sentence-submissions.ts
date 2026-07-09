import { unstable_noStore as noStore } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getClassRoster } from "@/lib/data/teacher-classes";
import { requireTeacherUser } from "@/lib/mastery/teacher-queries";

export type TeacherSentenceSubmissionStatus =
  | "submitted"
  | "approved"
  | "needs_revision"
  | "superseded";

export type TeacherSentenceSubmission = {
  id: string;
  studentId: string;
  wordItemId: string;
  sentenceText: string;
  dateKey: string;
  status: TeacherSentenceSubmissionStatus;
  teacherComment: string | null;
  submittedAt: string;
  reviewedAt: string | null;
};

type SubmissionRow = {
  id: string;
  student_id: string;
  word_item_id: string;
  sentence_text: string;
  date_key: string;
  status: TeacherSentenceSubmissionStatus;
  teacher_comment: string | null;
  submitted_at: string;
  reviewed_at: string | null;
};

function mapSubmissionRow(row: SubmissionRow): TeacherSentenceSubmission {
  return {
    id: row.id,
    studentId: row.student_id,
    wordItemId: row.word_item_id,
    sentenceText: row.sentence_text,
    dateKey: row.date_key,
    status: row.status,
    teacherComment: row.teacher_comment,
    submittedAt: row.submitted_at,
    reviewedAt: row.reviewed_at,
  };
}

export async function getPendingSentenceCountsForClass(classId: string): Promise<{
  total: number;
  byStudentId: Record<string, number>;
}> {
  noStore();
  await requireTeacherUser();

  const roster = await getClassRoster(classId);
  const studentIds = roster.map((student) => student.studentId);
  if (studentIds.length === 0) {
    return { total: 0, byStudentId: {} };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("student_sentence_submissions")
    .select("student_id")
    .eq("status", "submitted")
    .in("student_id", studentIds);

  if (error) {
    throw new Error(error.message);
  }

  const byStudentId: Record<string, number> = {};
  for (const row of data ?? []) {
    const studentId = String(row.student_id);
    byStudentId[studentId] = (byStudentId[studentId] ?? 0) + 1;
  }

  const total = Object.values(byStudentId).reduce((sum, count) => sum + count, 0);
  return { total, byStudentId };
}

export async function getSentenceSubmissionsForStudent(
  classId: string,
  studentId: string,
): Promise<TeacherSentenceSubmission[]> {
  noStore();
  await requireTeacherUser();

  const roster = await getClassRoster(classId);
  if (!roster.some((student) => student.studentId === studentId)) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("student_sentence_submissions")
    .select(
      "id, student_id, word_item_id, sentence_text, date_key, status, teacher_comment, submitted_at, reviewed_at",
    )
    .eq("student_id", studentId)
    .order("submitted_at", { ascending: false })
    .limit(50);

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as SubmissionRow[]).map(mapSubmissionRow);
}
