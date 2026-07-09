import { unstable_noStore as noStore } from "next/cache";
import {
  getClassRoster,
  getTeacherClass,
  type ClassRosterStudent,
  type TeacherClassRow,
} from "@/lib/data/teacher-classes";
import type { LearningStrandAssessment } from "@/lib/learning-strands";
import {
  buildFullStudentDiagnostic,
  buildTeacherProgressNarrative,
  studentNeedsAttention,
  type GrammarTableRow,
  type TeacherProgressNarrative,
  type VocabularyTableRow,
} from "@/lib/mastery/teacher-mastery-display";
import type {
  TeacherClassMasteryOverview,
  TeacherStudentMasteryDiagnostic,
} from "@/lib/mastery/teacher-mastery-summary";
import {
  getClassMasteryOverviewForTeacher,
  getStudentMasteryDiagnosticForTeacher,
  fetchMasteryRecordsForTeacher,
} from "@/lib/mastery/teacher-queries";
import { rowsToMasteryRecords } from "@/lib/mastery/teacher-mastery-summary";
import type { StudentMasteryRecord } from "@/lib/mastery/types";

export type TeacherStudentDiagnosticBundle = {
  teacherClass: TeacherClassRow;
  student: ClassRosterStudent;
  diagnostic: TeacherStudentMasteryDiagnostic;
  strands: LearningStrandAssessment[];
  vocabularyRows: VocabularyTableRow[];
  grammarRows: GrammarTableRow[];
  records: StudentMasteryRecord[];
  narrative: TeacherProgressNarrative;
  needsAttention: boolean;
};

export async function getStudentMasteryDiagnostic(
  studentId: string,
): Promise<TeacherStudentMasteryDiagnostic> {
  noStore();
  return getStudentMasteryDiagnosticForTeacher(studentId);
}

export async function getClassMasteryOverview(
  classId: string,
): Promise<TeacherClassMasteryOverview> {
  noStore();
  const teacherClass = await getTeacherClass(classId);
  if (!teacherClass) {
    throw new Error("Class not found.");
  }

  const roster = await getClassRoster(classId);
  const studentIds = roster.map((student) => student.studentId);
  return getClassMasteryOverviewForTeacher(classId, studentIds);
}

export async function getStudentDiagnosticBundle(
  classId: string,
  studentId: string,
): Promise<TeacherStudentDiagnosticBundle | null> {
  noStore();

  const [teacherClass, roster] = await Promise.all([
    getTeacherClass(classId),
    getClassRoster(classId),
  ]);
  if (!teacherClass) return null;

  const student = roster.find((row) => row.studentId === studentId);
  if (!student) return null;

  const rows = await fetchMasteryRecordsForTeacher(studentId);
  const records = rowsToMasteryRecords(rows);
  const { diagnostic, strands, vocabularyRows, grammarRows } = buildFullStudentDiagnostic(
    studentId,
    records,
  );
  const narrative = buildTeacherProgressNarrative({
    diagnostic,
    strands,
    studentDisplayName: student.displayName,
  });
  const needsAttention = studentNeedsAttention({
    dueReviewCount: diagnostic.dueReview.length,
    strands,
  });

  return {
    teacherClass,
    student,
    diagnostic,
    strands,
    vocabularyRows,
    grammarRows,
    records,
    narrative,
    needsAttention,
  };
}
