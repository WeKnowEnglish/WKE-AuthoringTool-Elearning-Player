import {
  ensureGuestDeviceId,
  getCachedAuthUserId,
} from "@/lib/auth/student-storage-id";

export const DAILY_WORD_INTRO_SEEN_PREFIX = "secondary-daily-word-intro-seen-v1:";

function storageKey(studentId: string, dateKey: string): string {
  return `${DAILY_WORD_INTRO_SEEN_PREFIX}${studentId}:${dateKey}`;
}

function readSeenFlag(studentId: string, dateKey: string): boolean {
  if (!studentId || !dateKey) return false;
  try {
    return localStorage.getItem(storageKey(studentId, dateKey)) === "1";
  } catch {
    return false;
  }
}

function writeSeenFlag(studentId: string, dateKey: string): void {
  if (!studentId || !dateKey) return;
  try {
    localStorage.setItem(storageKey(studentId, dateKey), "1");
  } catch {
    // ignore quota
  }
}

/**
 * Guest and auth ids can both be used on the same device when auth hydrates after
 * first paint. Cross-check only for the active student namespace, not arbitrary ids.
 */
function dailyIntroStudentIds(studentId: string): string[] {
  if (typeof window === "undefined" || !studentId) return [];

  const ids = new Set<string>([studentId]);
  const guestId = ensureGuestDeviceId();
  const authId = getCachedAuthUserId();

  if (authId && studentId === authId && guestId && guestId !== authId) {
    ids.add(guestId);
  }
  if (guestId && studentId === guestId && authId && authId !== guestId) {
    ids.add(authId);
  }

  return [...ids];
}

export function hasSeenDailyWordIntro(studentId: string, dateKey: string): boolean {
  if (typeof window === "undefined" || !dateKey) return false;

  return dailyIntroStudentIds(studentId).some((id) => readSeenFlag(id, dateKey));
}

export function markDailyWordIntroSeen(studentId: string, dateKey: string): void {
  if (typeof window === "undefined" || !dateKey) return;

  for (const id of dailyIntroStudentIds(studentId)) {
    writeSeenFlag(id, dateKey);
  }
}

/** Tests and debug only. */
export function clearDailyWordIntroSeen(studentId: string, dateKey: string): void {
  if (typeof window === "undefined" || !dateKey) return;

  for (const id of dailyIntroStudentIds(studentId)) {
    try {
      localStorage.removeItem(storageKey(id, dateKey));
    } catch {
      // ignore
    }
  }
}
