export type AppRole = "teacher" | "student";

export const TEACHER_DEFAULT_PATH = "/teacher/classes";
export const STUDENT_DEFAULT_PATH = "/home";
export const LOGIN_PATH = "/login";

/** Legacy accounts missing app_metadata.role — treated as teachers when signed in. */
const TEACHER_EMAIL_ALLOWLIST = new Set(["bradydmyers@gmail.com"]);

type AuthUserLike = {
  app_metadata?: Record<string, unknown> | null;
  email?: string | null;
} | null | undefined;

function normalizeEmail(email: string | null | undefined): string {
  return email?.trim().toLowerCase() ?? "";
}

export function isTeacherEmailAllowlisted(email: string | null | undefined): boolean {
  const normalized = normalizeEmail(email);
  return normalized.length > 0 && TEACHER_EMAIL_ALLOWLIST.has(normalized);
}

export function getAppRole(user: AuthUserLike): AppRole | null {
  const raw = user?.app_metadata?.role;
  if (raw === "teacher") return "teacher";
  if (isTeacherEmailAllowlisted(user?.email)) return "teacher";
  if (raw === "student") return "student";
  return null;
}

export function isTeacher(user: AuthUserLike): boolean {
  return getAppRole(user) === "teacher";
}

export function isStudent(user: AuthUserLike): boolean {
  return getAppRole(user) === "student";
}
