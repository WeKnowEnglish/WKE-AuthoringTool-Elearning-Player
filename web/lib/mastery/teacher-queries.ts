import { isTeacher } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import {
  buildTeacherClassStudentMasteryPreview,
  buildTeacherStudentMasteryDiagnostic,
  rowsToMasteryRecords,
  type TeacherClassMasteryOverview,
  type TeacherStudentMasteryDiagnostic,
} from "@/lib/mastery/teacher-mastery-summary";
import type { StudentMasteryRecordRow } from "@/lib/mastery/supabase-rows";
import type { User } from "@supabase/supabase-js";

export class TeacherMasteryAccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TeacherMasteryAccessError";
  }
}

export async function requireTeacherUser(): Promise<User> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id || !isTeacher(user)) {
    throw new TeacherMasteryAccessError("Teacher authentication required.");
  }

  return user;
}

export async function fetchMasteryRecordsForTeacher(
  studentId: string,
): Promise<StudentMasteryRecordRow[]> {
  await requireTeacherUser();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("student_mastery_records")
    .select("id, student_id, target_key, target_type, record, updated_at, created_at")
    .eq("student_id", studentId)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as StudentMasteryRecordRow[];
}

export async function fetchMasteryRecordsForTeacherStudents(
  studentIds: string[],
): Promise<StudentMasteryRecordRow[]> {
  await requireTeacherUser();
  if (!studentIds.length) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("student_mastery_records")
    .select("id, student_id, target_key, target_type, record, updated_at, created_at")
    .in("student_id", studentIds)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as StudentMasteryRecordRow[];
}

export async function getStudentMasteryDiagnosticForTeacher(
  studentId: string,
): Promise<TeacherStudentMasteryDiagnostic> {
  const rows = await fetchMasteryRecordsForTeacher(studentId);
  const records = rowsToMasteryRecords(rows);
  return buildTeacherStudentMasteryDiagnostic(studentId, records);
}

function groupRowsByStudentId(
  rows: StudentMasteryRecordRow[],
): Map<string, StudentMasteryRecordRow[]> {
  const grouped = new Map<string, StudentMasteryRecordRow[]>();
  for (const row of rows) {
    const list = grouped.get(row.student_id) ?? [];
    list.push(row);
    grouped.set(row.student_id, list);
  }
  return grouped;
}

export async function getClassMasteryOverviewForTeacher(
  classId: string,
  studentIds: string[],
): Promise<TeacherClassMasteryOverview> {
  await requireTeacherUser();

  const rows = await fetchMasteryRecordsForTeacherStudents(studentIds);
  const grouped = groupRowsByStudentId(rows);

  const students = studentIds.map((studentId) => {
    const studentRows = grouped.get(studentId) ?? [];
    const records = rowsToMasteryRecords(studentRows);
    return buildTeacherClassStudentMasteryPreview(studentId, records);
  });

  return { classId, students };
}
