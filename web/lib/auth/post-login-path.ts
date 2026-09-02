import {
  getAppRole,
  LOGIN_PATH,
  mustChangePassword,
  STUDENT_DEFAULT_PATH,
  TEACHER_DEFAULT_PATH,
  TEACHER_SET_PASSWORD_PATH,
  type AppRole,
} from "@/lib/auth/roles";
import { isStudentLoginPath } from "@/lib/auth/student-login";
import { isSecondaryEligibleBand } from "@/lib/auth/student-bands";

export const STUDENT_SECONDARY_DEFAULT_PATH = "/secondary";

function safeInternalPath(path: string | null | undefined, fallback: string): string {
  if (!path || !path.startsWith("/") || path.startsWith("//")) return fallback;
  if (path.startsWith(LOGIN_PATH) || isStudentLoginPath(path)) return fallback;
  return path;
}

/** Map retired student hubs onto Primary (F5). */
export function migrateLegacyStudentPath(path: string): string {
  if (path === "/home" || path.startsWith("/home?")) {
    try {
      const url = new URL(path, "http://local.invalid");
      if (url.searchParams.get("collection") === "games") {
        return "/primary?nav=games";
      }
      const message = url.searchParams.get("message");
      if (message) {
        return `/primary?message=${encodeURIComponent(message)}`;
      }
    } catch {
      /* fall through */
    }
    return "/primary";
  }
  if (path === "/learn" || path.startsWith("/learn?")) {
    return "/primary";
  }
  if (path === "/testprimary" || path.startsWith("/testprimary?")) {
    return "/primary";
  }
  return path;
}

function isTeacherOnlyPath(path: string): boolean {
  return path.startsWith("/teacher") ||
    path === "/live-game/host" ||
    path.startsWith("/live-game/host?") ||
    path.startsWith("/live-game/question-sets/");
}

/** Where to send a user immediately after a successful sign-in. */
export function resolvePostLoginPath(opts: {
  role: AppRole;
  learningBand?: string | null;
  next?: string | null;
  /** Teachers with first-login induction must set a password before the portal. */
  mustChangePassword?: boolean;
}): string {
  if (opts.role === "teacher" && opts.mustChangePassword) {
    return TEACHER_SET_PASSWORD_PATH;
  }

  const fallback =
    opts.role === "teacher"
      ? TEACHER_DEFAULT_PATH
      : isSecondaryEligibleBand(opts.learningBand)
        ? STUDENT_SECONDARY_DEFAULT_PATH
        : STUDENT_DEFAULT_PATH;
  const next = opts.next?.trim();
  if (!next) return fallback;

  const safe = migrateLegacyStudentPath(safeInternalPath(next, fallback));
  if (opts.role === "teacher") {
    if (!isTeacherOnlyPath(safe)) return TEACHER_DEFAULT_PATH;
    // Never honor a deep link that skips password induction (flag handled above).
    if (safe === TEACHER_SET_PASSWORD_PATH || safe.startsWith(`${TEACHER_SET_PASSWORD_PATH}?`)) {
      return TEACHER_SET_PASSWORD_PATH;
    }
    return safe;
  }
  if (isTeacherOnlyPath(safe)) return fallback;
  return safe;
}

export function resolveLandingRedirectPath(user: {
  app_metadata?: Record<string, unknown> | null;
  user_metadata?: Record<string, unknown> | null;
  email?: string | null;
} | null): string | null {
  const role = getAppRole(user);
  if (role === "teacher") {
    if (mustChangePassword(user)) return TEACHER_SET_PASSWORD_PATH;
    return TEACHER_DEFAULT_PATH;
  }
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
