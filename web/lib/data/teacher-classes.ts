import { unstable_noStore as noStore } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { cache } from "react";

export type TeacherClassRow = {
  id: string;
  teacher_id: string;
  title: string;
  course_id: string | null;
  join_code: string;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};

export type ClassEnrollmentRow = {
  class_id: string;
  student_id: string;
  enrolled_at: string;
};

export type ClassRosterStudent = {
  studentId: string;
  username: string;
  displayName: string;
  learningBand: string | null;
  enrolledAt: string;
};

export type TeacherClassSummary = TeacherClassRow & {
  enrollmentCount: number;
};

async function requireTeacherUserId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id || user.app_metadata?.role !== "teacher") {
    throw new Error("Teacher authentication required.");
  }
  return user.id;
}

export const listTeacherClasses = cache(async function listTeacherClasses(): Promise<
  TeacherClassSummary[]
> {
  noStore();
  await requireTeacherUserId();
  const supabase = await createClient();

  const { data: classes, error } = await supabase
    .from("teacher_classes")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  const rows = (classes ?? []) as TeacherClassRow[];
  if (!rows.length) return [];

  const classIds = rows.map((row) => row.id);
  const { data: enrollments, error: enrollmentError } = await supabase
    .from("class_enrollments")
    .select("class_id")
    .in("class_id", classIds);

  if (enrollmentError) throw enrollmentError;

  const counts = new Map<string, number>();
  for (const row of enrollments ?? []) {
    const classId = row.class_id as string;
    counts.set(classId, (counts.get(classId) ?? 0) + 1);
  }

  return rows.map((row) => ({
    ...row,
    enrollmentCount: counts.get(row.id) ?? 0,
  }));
});

export async function getTeacherClass(classId: string): Promise<TeacherClassRow | null> {
  noStore();
  await requireTeacherUserId();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("teacher_classes")
    .select("*")
    .eq("id", classId)
    .maybeSingle();

  if (error) throw error;
  return (data as TeacherClassRow | null) ?? null;
}

export async function getClassRoster(classId: string): Promise<ClassRosterStudent[]> {
  noStore();
  await requireTeacherUserId();
  const supabase = await createClient();

  const { data: enrollments, error } = await supabase
    .from("class_enrollments")
    .select("student_id, enrolled_at")
    .eq("class_id", classId)
    .order("enrolled_at", { ascending: true });

  if (error) throw error;
  const rows = (enrollments ?? []) as Pick<ClassEnrollmentRow, "student_id" | "enrolled_at">[];
  if (!rows.length) return [];

  const studentIds = rows.map((row) => row.student_id);
  const { data: profiles, error: profileError } = await supabase
    .from("student_profiles")
    .select("user_id, username, display_name, learning_band")
    .in("user_id", studentIds);

  if (profileError) throw profileError;

  const profileById = new Map(
    (profiles ?? []).map((profile) => [
      profile.user_id as string,
      {
        username: profile.username as string,
        displayName: profile.display_name as string,
        learningBand: (profile.learning_band as string | null) ?? null,
      },
    ]),
  );

  return rows.map((row) => {
    const profile = profileById.get(row.student_id);
    return {
      studentId: row.student_id,
      username: profile?.username ?? row.student_id,
      displayName: profile?.displayName ?? profile?.username ?? "Student",
      learningBand: profile?.learningBand ?? null,
      enrolledAt: row.enrolled_at,
    };
  });
}
