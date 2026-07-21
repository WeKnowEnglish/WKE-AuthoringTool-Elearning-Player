export type AppRole = "teacher" | "student";

/**
 * Teacher product tier (stored in `app_metadata.teacher_tier`).
 * - light: classes, word packs, media, grammar posters, light homework + read-only mastery
 * - plus: live hosting (virtual classroom, live game, etc.)
 * Missing/unknown tier defaults to `plus` so existing teachers keep full access.
 */
export type TeacherTier = "light" | "plus";

export const TEACHER_DEFAULT_PATH = "/teacher/classes";
/** First-login password induction (outside the secure teacher shell). */
export const TEACHER_SET_PASSWORD_PATH = "/teacher/set-password";
/** Primary student dashboard. Legacy world hub remains at `/home`. */
export const STUDENT_DEFAULT_PATH = "/primary";
export const LOGIN_PATH = "/login";

/** Temporary provision passwords that induction must reject as the new password. */
export const TEACHER_TEMP_PASSWORDS = new Set(["00000000", "000000"]);

/**
 * Bootstrap developer / platform-admin emails.
 * Prefer `app_metadata.admin === true` on the Auth user; this list is the fallback.
 */
const ADMIN_EMAIL_ALLOWLIST = new Set(["bradydmyers@gmail.com"]);

/** Legacy accounts missing app_metadata.role — treated as teachers when signed in. */
const TEACHER_EMAIL_ALLOWLIST = new Set(["bradydmyers@gmail.com"]);

type AuthUserLike = {
  app_metadata?: Record<string, unknown> | null;
  email?: string | null;
} | null | undefined;

function normalizeEmail(email: string | null | undefined): string {
  return email?.trim().toLowerCase() ?? "";
}

function parseEmailAllowlist(raw: string | undefined): Set<string> | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  return new Set(
    trimmed
      .split(",")
      .map((part) => part.trim().toLowerCase())
      .filter(Boolean),
  );
}

function parseBooleanMetadataFlag(value: unknown): boolean {
  return value === true || value === "true" || value === 1;
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

/**
 * Teacher product tier. Non-teachers return null.
 * Unset metadata → `plus` (legacy full teachers).
 */
export function getTeacherTier(user: AuthUserLike): TeacherTier | null {
  if (!isTeacher(user)) return null;
  const raw = user?.app_metadata?.teacher_tier;
  if (raw === "light") return "light";
  return "plus";
}

export function isTeacherLight(user: AuthUserLike): boolean {
  return getTeacherTier(user) === "light";
}

export function isTeacherPlus(user: AuthUserLike): boolean {
  return getTeacherTier(user) === "plus";
}

/** Live hosting / virtual classroom / live game. Light teachers cannot host. */
export function canHostLive(user: AuthUserLike): boolean {
  return isTeacherPlus(user);
}

/**
 * First-login password induction flag (`app_metadata.must_change_password`).
 * Enforced by a later secure-layout gate; metadata is set at provision time.
 */
export function mustChangePassword(user: AuthUserLike): boolean {
  if (!isTeacher(user)) return false;
  return parseBooleanMetadataFlag(user?.app_metadata?.must_change_password);
}

function hasAdminMetadataFlag(user: AuthUserLike): boolean {
  return parseBooleanMetadataFlag(user?.app_metadata?.admin);
}

/**
 * Platform admin (developer). Teachers are not admins by default.
 * Used for lexicon curriculum approval and similar platform-only tools.
 *
 * Grant via Auth `app_metadata.admin = true` (preferred), or
 * `ADMIN_EMAILS=a@x.com,b@y.com`, or the bootstrap admin email allowlist.
 */
export function isAdmin(user: AuthUserLike): boolean {
  if (!isTeacher(user)) return false;
  if (hasAdminMetadataFlag(user)) return true;

  const email = normalizeEmail(user?.email);
  if (!email) return false;

  const envAllow = parseEmailAllowlist(process.env.ADMIN_EMAILS);
  if (envAllow) return envAllow.has(email);

  return ADMIN_EMAIL_ALLOWLIST.has(email);
}

/** @deprecated Prefer isAdmin — same gate for lexicon review. */
export function isCurriculumReviewer(user: AuthUserLike): boolean {
  return isAdmin(user);
}
