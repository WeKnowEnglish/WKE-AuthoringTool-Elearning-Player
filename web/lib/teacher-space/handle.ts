const HANDLE_RE = /^[a-z0-9]([a-z0-9-]{1,30}[a-z0-9])?$/;

/** Reserved so Space URLs never collide with app routes or brand terms. */
export const RESERVED_TEACHER_SPACE_HANDLES = new Set([
  "admin",
  "api",
  "app",
  "auth",
  "bank",
  "class",
  "classes",
  "dev",
  "grammar",
  "home",
  "join",
  "join-class",
  "learn",
  "lesson",
  "lessons",
  "live",
  "live-game",
  "login",
  "me",
  "pilots",
  "play",
  "primary",
  "public",
  "space",
  "spaces",
  "studio",
  "student",
  "t",
  "teacher",
  "teachers",
  "wke",
  "www",
]);

export function normalizeTeacherSpaceHandle(raw: string): string {
  return raw.trim().toLowerCase();
}

export function assertValidTeacherSpaceHandle(raw: string): string {
  const handle = normalizeTeacherSpaceHandle(raw);
  if (!HANDLE_RE.test(handle)) {
    throw new Error(
      "Handle must be 3–32 characters: lowercase letters, numbers, and hyphens (no leading/trailing hyphen).",
    );
  }
  if (RESERVED_TEACHER_SPACE_HANDLES.has(handle)) {
    throw new Error(`The handle “${handle}” is reserved. Choose another.`);
  }
  return handle;
}

/** Suggest a handle from email local-part (may still need uniqueness suffix). */
export function suggestHandleFromEmail(email: string | null | undefined): string {
  const local = (email ?? "teacher").split("@")[0] ?? "teacher";
  let base = local
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 28);
  if (base.length < 3) base = `teacher-${base || "space"}`.slice(0, 32);
  if (!HANDLE_RE.test(base) || RESERVED_TEACHER_SPACE_HANDLES.has(base)) {
    base = `teacher-${base.replace(/^teacher-/, "")}`.slice(0, 32);
  }
  if (!HANDLE_RE.test(base)) {
    base = `t-${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}`;
  }
  return base;
}
