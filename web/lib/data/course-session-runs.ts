import { unstable_noStore as noStore } from "next/cache";
import { isStudent } from "@/lib/auth/roles";
import {
  GRADE_4_SESSION_1_RUN,
  normalizeCourseSessionRunRow,
  type CourseSessionRunRecord,
} from "@/lib/curriculum/session-run";
import { createClient } from "@/lib/supabase/server";

export async function getMyGrade4Session1Run(): Promise<CourseSessionRunRecord | null> {
  noStore();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id || !isStudent(user)) return null;

  const { data, error } = await supabase
    .from("student_course_session_runs")
    .select("id, student_id, course_id, unit_id, session_id, content_version, status, active_phase, active_step_id, state, started_at, completed_at, updated_at")
    .eq("student_id", user.id)
    .eq("course_id", GRADE_4_SESSION_1_RUN.courseId)
    .eq("unit_id", GRADE_4_SESSION_1_RUN.unitId)
    .eq("session_id", GRADE_4_SESSION_1_RUN.sessionId)
    .maybeSingle();

  if (error || !data) return null;
  return normalizeCourseSessionRunRow(data as Record<string, unknown>);
}
