import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Grade4Session1Pilot } from "@/components/curriculum/Grade4Session1Pilot";
import { isStudent, isTeacher, TEACHER_DEFAULT_PATH } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Enter the Welcome Fair | Grade 4 WKE",
  description: "Session 1 of the Grade 4 WKE Learning Path.",
  robots: { index: false, follow: false },
};

export default async function Grade4Session1Page() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/primary/learn/grade-4/unit-1/session-1");
  if (isTeacher(user)) redirect(TEACHER_DEFAULT_PATH);
  if (!isStudent(user)) redirect("/login?error=unknown_role");
  return <Grade4Session1Pilot />;
}

