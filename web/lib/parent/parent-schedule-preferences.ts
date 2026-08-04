import "server-only";

import { unstable_noStore as noStore } from "next/cache";
import {
  getGuardianSchedulePreference,
  listScheduleWindowsForGuardianClass,
} from "@/lib/data/class-schedule-preferences";
import type { ClassScheduleWindow } from "@/lib/class-schedule/preference-types";
import { listParentLinkedStudents } from "@/lib/parent/guardian-data";
import { getParentStudentSchedule } from "@/lib/parent/parent-schedule";

export type ParentSchedulePreferenceContext = {
  classId: string;
  classTitle: string | null;
  open: boolean;
  windows: ClassScheduleWindow[];
  rankedWindowIds: string[];
};

export async function getParentSchedulePreferenceContext(
  studentId: string,
): Promise<ParentSchedulePreferenceContext | null> {
  noStore();
  const linked = await listParentLinkedStudents();
  const student = linked.find((row) => row.studentId === studentId.trim());
  if (!student?.classId || !student.preferenceCollectionOpen) return null;

  const windows = await listScheduleWindowsForGuardianClass(student.classId);
  if (windows.length < 2) return null;

  const existing = await getGuardianSchedulePreference({
    classId: student.classId,
    studentId: student.studentId,
  });

  return {
    classId: student.classId,
    classTitle: student.classTitle,
    open: true,
    windows,
    rankedWindowIds: existing?.rankedWindowIds ?? [],
  };
}

export { getParentStudentSchedule };
