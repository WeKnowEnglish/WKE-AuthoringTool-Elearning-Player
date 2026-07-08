import { redirect } from "next/navigation";
import { isStudent, isTeacher, TEACHER_DEFAULT_PATH } from "@/lib/auth/roles";
import { isSecondaryEligibleBand } from "@/lib/auth/student-bands";
import { createClient } from "@/lib/supabase/server";

export async function requireSecondaryStudentAccess(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?portal=student");
  }

  if (isTeacher(user)) {
    redirect(TEACHER_DEFAULT_PATH);
  }

  if (!isStudent(user)) {
    redirect("/login?error=unknown_role");
  }

  const learningBand =
    typeof user.user_metadata?.learning_band === "string"
      ? user.user_metadata.learning_band
      : null;

  if (!isSecondaryEligibleBand(learningBand)) {
    redirect("/home?message=secondary_for_a2");
  }
}
