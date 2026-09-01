import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Grade4Session2PracticePack } from "@/components/curriculum/Grade4Session2PracticePack";
import { isStudent, isTeacher, TEACHER_DEFAULT_PATH } from "@/lib/auth/roles";
import { getMyGrade4Session2Run } from "@/lib/data/course-session-runs";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Session 2 Practice | Grade 4 WKE",
  description: "Supporting activities for Find a Fair Friend.",
  robots: { index: false, follow: false },
};

export default async function Grade4Session2PracticePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/primary/learn/grade-4/unit-1/session-2/practice");
  if (isTeacher(user)) redirect(TEACHER_DEFAULT_PATH);
  if (!isStudent(user)) redirect("/login?error=unknown_role");
  const initialRun = await getMyGrade4Session2Run();
  return <Grade4Session2PracticePack initialRun={initialRun} />;
}
