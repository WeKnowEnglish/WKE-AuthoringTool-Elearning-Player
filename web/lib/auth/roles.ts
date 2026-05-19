export type AppRole = "teacher" | "student";

export const TEACHER_DEFAULT_PATH = "/teacher/courses";
export const STUDENT_DEFAULT_PATH = "/home";
export const LOGIN_PATH = "/login";

export function getAppRole(user: {
  app_metadata?: Record<string, unknown> | null;
} | null | undefined): AppRole | null {
  const raw = user?.app_metadata?.role;
  if (raw === "teacher") return "teacher";
  if (raw === "student") return "student";
  return null;
}

export function isTeacher(user: { app_metadata?: Record<string, unknown> | null } | null): boolean {
  return getAppRole(user) === "teacher";
}

export function isStudent(user: { app_metadata?: Record<string, unknown> | null } | null): boolean {
  return getAppRole(user) === "student";
}
