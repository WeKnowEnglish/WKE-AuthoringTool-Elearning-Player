import { redirect } from "next/navigation";
import { StudentHubClient } from "@/components/student-hub/StudentHubClient";
import { isStudent, isTeacher, TEACHER_DEFAULT_PATH } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

export default async function StudentHomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  if (isTeacher(user)) {
    redirect(TEACHER_DEFAULT_PATH);
  }

  if (!isStudent(user)) {
    redirect("/login?error=unknown_role");
  }

  return <StudentHubClient />;
}
