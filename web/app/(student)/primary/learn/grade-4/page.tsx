import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Grade4LearningPathsCatalog } from "@/components/curriculum/Grade4LearningPathsCatalog";
import { isStudent, isTeacher, TEACHER_DEFAULT_PATH } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Grade 4 WKE Learning Paths | We Know English",
  description: "Grade 4 student curriculum and learning sessions.",
  robots: { index: false, follow: false },
};

export default async function Grade4LearningPathsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/primary/learn/grade-4");
  if (isTeacher(user)) redirect(TEACHER_DEFAULT_PATH);
  if (!isStudent(user)) redirect("/login?error=unknown_role");
  return <Grade4LearningPathsCatalog />;
}

