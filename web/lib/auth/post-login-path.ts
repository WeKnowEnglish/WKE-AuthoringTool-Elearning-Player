import {
  getAppRole,
  LOGIN_PATH,
  STUDENT_DEFAULT_PATH,
  TEACHER_DEFAULT_PATH,
  type AppRole,
} from "@/lib/auth/roles";
import { isSecondaryEligibleBand } from "@/lib/auth/student-bands";

export const STUDENT_SECONDARY_DEFAULT_PATH = "/secondary";

function safeInternalPath(path: string | null | undefined, fallback: string): string {
  if (!path || !path.startsWith("/") || path.startsWith("//")) return fallback;
  if (path.startsWith(LOGIN_PATH)) return fallback;
  return path;
}

/** Where to send a user immediately after a successful sign-in. */
export function resolvePostLoginPath(opts: {
  role: AppRole;
  learningBand?: string | null;
  next?: string | null;
}): string {
  const fallback =
    opts.role === "teacher"
      ? TEACHER_DEFAULT_PATH
      : isSecondaryEligibleBand(opts.learningBand)
        ? STUDENT_SECONDARY_DEFAULT_PATH
        : STUDENT_DEFAULT_PATH;
  const next = opts.next?.trim();
  if (!next) return fallback;

  const safe = safeInternalPath(next, fallback);
  if (opts.role === "teacher") {
    if (!safe.startsWith("/teacher")) return TEACHER_DEFAULT_PATH;
    return safe;
  }
  if (safe.startsWith("/teacher")) return fallback;
  return safe;
}

export function resolveLandingRedirectPath(user: {
  app_metadata?: Record<string, unknown> | null;
  user_metadata?: Record<string, unknown> | null;
} | null): string | null {
  const role = getAppRole(user);
  if (role === "teacher") return TEACHER_DEFAULT_PATH;
  if (role === "student") {
    const learningBand =
      typeof user?.user_metadata?.learning_band === "string"
        ? user.user_metadata.learning_band
        : null;
    return isSecondaryEligibleBand(learningBand)
      ? STUDENT_SECONDARY_DEFAULT_PATH
      : STUDENT_DEFAULT_PATH;
  }
  return null;
}
