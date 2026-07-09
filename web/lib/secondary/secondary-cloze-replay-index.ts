const CLOZE_REPLAY_INDEX_PREFIX = "secondary-cloze-replay-v1:";

function storageKey(studentId: string, dateKey: string): string {
  return `${CLOZE_REPLAY_INDEX_PREFIX}${studentId}:${dateKey}`;
}

export function getSecondaryClozeReplayIndex(studentId: string, dateKey: string): number {
  if (typeof window === "undefined" || !studentId || !dateKey) return 0;

  try {
    const raw = localStorage.getItem(storageKey(studentId, dateKey));
    if (!raw) return 0;
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  } catch {
    return 0;
  }
}

export function setSecondaryClozeReplayIndex(
  studentId: string,
  dateKey: string,
  replayIndex: number,
): void {
  if (typeof window === "undefined" || !studentId || !dateKey) return;

  try {
    localStorage.setItem(storageKey(studentId, dateKey), String(Math.max(0, replayIndex)));
  } catch {
    // ignore quota
  }
}

export function incrementSecondaryClozeReplayIndex(studentId: string, dateKey: string): number {
  const next = getSecondaryClozeReplayIndex(studentId, dateKey) + 1;
  setSecondaryClozeReplayIndex(studentId, dateKey, next);
  return next;
}

export function clearSecondaryClozeReplayIndex(studentId: string, dateKey: string): void {
  if (typeof window === "undefined" || !studentId || !dateKey) return;

  try {
    localStorage.removeItem(storageKey(studentId, dateKey));
  } catch {
    // ignore
  }
}
