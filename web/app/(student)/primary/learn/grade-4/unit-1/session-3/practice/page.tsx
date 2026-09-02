import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Grade4Session3PracticePack } from "@/components/curriculum/Grade4Session3PracticePack";
import { isStudent, isTeacher, TEACHER_DEFAULT_PATH } from "@/lib/auth/roles";
import { getMyGrade4Session3Run } from "@/lib/data/course-session-runs";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Session 3 Practice | Grade 4 WKE",
  description: "Supporting activities for Find Something in Common.",
  robots: { index: false, follow: false },
};

export default async function Grade4Session3PracticePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/primary/learn/grade-4/unit-1/session-3/practice");
  if (isTeacher(user)) redirect(TEACHER_DEFAULT_PATH);
  if (!isStudent(user)) redirect("/login?error=unknown_role");
  const initialRun = await getMyGrade4Session3Run();
  return <Grade4Session3PracticePack initialRun={initialRun} />;
}
