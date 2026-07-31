import { unstable_noStore as noStore } from "next/cache";
import {
  DEFAULT_STUDENT_CLASSROOM_TAB_SETTINGS,
  normalizeStudentClassroomTabSettings,
  type StudentClassroomTabSettings,
} from "@/lib/classroom/classroom-tabs";
import { createClient } from "@/lib/supabase/server";

export type StudentClassMembership = {
  classId: string;
  title: string;
  joinCode: string;
  enrolledAt: string;
  studentTabs: StudentClassroomTabSettings;
};

type StudentClassMembershipRow = {
  class_id: string;
  title: string;
  join_code: string;
  enrolled_at: string;
  student_tab_schedule_enabled?: boolean | null;
  student_tab_noticeboard_enabled?: boolean | null;
  student_tab_materials_enabled?: boolean | null;
};

export async function getStudentClassMemberships(): Promise<StudentClassMembership[]> {
  noStore();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id || user.app_metadata?.role !== "student") {
    return [];
  }

  const { data, error } = await supabase.rpc("student_class_memberships");
  if (error) throw error;

  const rows = (data ?? []) as StudentClassMembershipRow[];
  return rows.map((row) => ({
    classId: row.class_id,
    title: row.title,
    joinCode: row.join_code,
    enrolledAt: row.enrolled_at,
    studentTabs: normalizeStudentClassroomTabSettings({
      schedule: row.student_tab_schedule_enabled ?? false,
      noticeboard: row.student_tab_noticeboard_enabled ?? false,
      materials: row.student_tab_materials_enabled ?? false,
    }),
  }));
}

/** Returns the membership for `classId` when the signed-in student is enrolled. */
export async function getStudentClassMembership(
  classId: string,
): Promise<StudentClassMembership | null> {
  const memberships = await getStudentClassMemberships();
  return memberships.find((membership) => membership.classId === classId) ?? null;
}

export function studentTabsFromMembership(
  membership: StudentClassMembership | null | undefined,
): StudentClassroomTabSettings {
  return membership?.studentTabs ?? DEFAULT_STUDENT_CLASSROOM_TAB_SETTINGS;
}
