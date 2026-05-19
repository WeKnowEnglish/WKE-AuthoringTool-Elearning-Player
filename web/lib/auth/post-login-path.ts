import {
  getAppRole,
  LOGIN_PATH,
  STUDENT_DEFAULT_PATH,
  TEACHER_DEFAULT_PATH,
  type AppRole,
} from "@/lib/auth/roles";

function safeInternalPath(path: string | null | undefined, fallback: string): string {
  if (!path || !path.startsWith("/") || path.startsWith("//")) return fallback;
  if (path.startsWith(LOGIN_PATH)) return fallback;
  return path;
}

/** Where to send a user immediately after a successful sign-in. */
export function resolvePostLoginPath(opts: {
  role: AppRole;
  next?: string | null;
}): string {
  const fallback =
    opts.role === "teacher" ? TEACHER_DEFAULT_PATH : STUDENT_DEFAULT_PATH;
  const next = opts.next?.trim();
  if (!next) return fallback;

  const safe = safeInternalPath(next, fallback);
  if (opts.role === "teacher") {
    if (!safe.startsWith("/teacher")) return TEACHER_DEFAULT_PATH;
    return safe;
  }
  if (safe.startsWith("/teacher")) return STUDENT_DEFAULT_PATH;
  return safe;
}

export function resolveLandingRedirectPath(user: {
  app_metadata?: Record<string, unknown> | null;
} | null): string | null {
  const role = getAppRole(user);
  if (role === "teacher") return TEACHER_DEFAULT_PATH;
  if (role === "student") return STUDENT_DEFAULT_PATH;
  return null;
}
