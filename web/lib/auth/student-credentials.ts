/** Internal domain for synthetic student auth emails (never shown to kids). */
export const STUDENT_EMAIL_DOMAIN = "students.wke.internal";

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
}

export function validateUsername(normalized: string): string | null {
  if (normalized.length < 3) return "Username must be at least 3 characters.";
  if (normalized.length > 20) return "Username must be 20 characters or fewer.";
  if (!USERNAME_RE.test(normalized)) {
    return "Use letters, numbers, and underscores only.";
  }
  return null;
}

export function validateStudentPin(pin: string): string | null {
  const trimmed = pin.trim();
  if (!/^\d{4,6}$/.test(trimmed)) {
    return "Secret code must be 4–6 numbers.";
  }
  return null;
}

export function usernameToStudentEmail(normalizedUsername: string): string {
  return `${normalizedUsername}@${STUDENT_EMAIL_DOMAIN}`;
}

export function isStudentAuthEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.toLowerCase().endsWith(`@${STUDENT_EMAIL_DOMAIN}`);
}
