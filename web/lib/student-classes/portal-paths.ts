import {
  STUDENT_DEFAULT_PATH,
  type AppRole,
} from "@/lib/auth/roles";
import { isSecondaryEligibleBand } from "@/lib/auth/student-bands";
import { STUDENT_SECONDARY_DEFAULT_PATH } from "@/lib/auth/post-login-path";

/** Portal home for a student based on learning band. */
export function resolveStudentHomePath(learningBand?: string | null): string {
  return isSecondaryEligibleBand(learningBand)
    ? STUDENT_SECONDARY_DEFAULT_PATH
    : STUDENT_DEFAULT_PATH;
}

/** Enrollment-gated private Classroom URL for the student's portal. */
export function resolveStudentClassroomPath(
  classId: string,
  learningBand?: string | null,
): string {
  const base = isSecondaryEligibleBand(learningBand)
    ? "/secondary/class"
    : "/primary/class";
  return `${base}/${encodeURIComponent(classId)}`;
}

export function learningBandFromUser(user: {
  user_metadata?: Record<string, unknown> | null;
} | null): string | null {
  const band = user?.user_metadata?.learning_band;
  return typeof band === "string" ? band : null;
}

/** Narrow helper for pages that already know AppRole. */
export function studentHomeForRole(
  role: AppRole,
  learningBand?: string | null,
): string {
  if (role !== "student") return STUDENT_DEFAULT_PATH;
  return resolveStudentHomePath(learningBand);
}
