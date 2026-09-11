import { isLandingTrackBand, type LandingTrackBand, type LearningBand } from "@/lib/learning-band";

export const STUDENT_PRIMARY_LOGIN_PATH = "/primary/login";
export const STUDENT_SECONDARY_LOGIN_PATH = "/secondary/login";

function firstPathSegment(path: string): string {
  const [pathname] = path.split("?");
  return pathname ?? "";
}

function isSafeNextPath(path: string): boolean {
  return path.startsWith("/") && !path.startsWith("//");
}

export function isStudentLoginPath(path: string | null | undefined): boolean {
  const pathname = firstPathSegment(path?.trim() ?? "");
  return (
    pathname === STUDENT_PRIMARY_LOGIN_PATH ||
    pathname === STUDENT_SECONDARY_LOGIN_PATH
  );
}

/** Public Primary / Secondary login door, optionally preserving a post-login next path. */
export function studentLoginPath(
  band: LandingTrackBand,
  next?: string | null,
): string {
  const base =
    band === "a2" ? STUDENT_SECONDARY_LOGIN_PATH : STUDENT_PRIMARY_LOGIN_PATH;
  const trimmed = next?.trim() ?? "";
  if (!trimmed || !isSafeNextPath(trimmed) || isStudentLoginPath(trimmed)) {
    return base;
  }
  return `${base}?next=${encodeURIComponent(trimmed)}`;
}

/**
 * Band used for new-account creation on a student login door.
 * Sign-in still prefers the account's saved band.
 */
export function resolveStudentDoorBand(input: {
  bandParam?: string | null;
  nextPath?: string | null;
}): LearningBand | null {
  const explicit = input.bandParam?.trim() ?? "";
  if (isLandingTrackBand(explicit)) return explicit;

  const nextPath = firstPathSegment(input.nextPath?.trim() ?? "");
  if (nextPath === "/primary" || nextPath.startsWith("/primary/")) return "a1";
  if (nextPath === "/secondary" || nextPath.startsWith("/secondary/")) return "a2";
  return null;
}
