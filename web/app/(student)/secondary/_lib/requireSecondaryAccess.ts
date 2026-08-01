import { redirect } from "next/navigation";
import { isStudent, isTeacher, TEACHER_DEFAULT_PATH } from "@/lib/auth/roles";
import { isSecondaryEligibleBand } from "@/lib/auth/student-bands";
import { createClient } from "@/lib/supabase/server";

function safeLoginNext(path: string | undefined): string | null {
  const next = path?.trim();
  if (!next || !next.startsWith("/") || next.startsWith("//")) return null;
  return next;
}

export async function requireSecondaryStudentAccess(opts?: {
  /** Preserve deep links through Secondary login (e.g. homework). */
  next?: string;
}): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const next = safeLoginNext(opts?.next);
    redirect(
      next
        ? `/secondary/login?next=${encodeURIComponent(next)}`
        : "/secondary/login",
    );
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
    redirect("/primary?message=secondary_for_a2");
  }
}
