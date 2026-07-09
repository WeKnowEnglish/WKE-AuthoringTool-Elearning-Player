import { unstable_noStore as noStore } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type StudentClassMembership = {
  classId: string;
  title: string;
  enrolledAt: string;
};

type StudentClassMembershipRow = {
  class_id: string;
  title: string;
  enrolled_at: string;
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
    enrolledAt: row.enrolled_at,
  }));
}
