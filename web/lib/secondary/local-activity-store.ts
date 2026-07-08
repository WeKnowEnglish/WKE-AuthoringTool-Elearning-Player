import type { LocalActivityWordState } from "@/lib/secondary/local-activity-types";
import type { SecondaryTodayActivityKey } from "@/lib/secondary/types";

export const LOCAL_ACTIVITY_STORAGE_KEY_PREFIX = "secondary-local-activity-v1:";

export function buildSecondaryActivitySessionId(
  dateKey: string,
  activityKey: SecondaryTodayActivityKey,
): string {
  return `${dateKey}:${activityKey}`;
}

export function getLocalActivityStorageKey(
  studentId: string,
  activitySessionId: string,
): string {
  return `${LOCAL_ACTIVITY_STORAGE_KEY_PREFIX}${studentId}:${activitySessionId}`;
}

function canUseLocalStorage(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function readLocalActivityMap(
  studentId: string,
  activitySessionId: string,
): Record<string, LocalActivityWordState> {
  if (!canUseLocalStorage()) return {};

  try {
    const raw = localStorage.getItem(
      getLocalActivityStorageKey(studentId, activitySessionId),
    );
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const next: Record<string, LocalActivityWordState> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (!value || typeof value !== "object") continue;
      const state = value as LocalActivityWordState;
      if (typeof state.wordItemId === "string") {
        next[state.wordItemId] = state;
      } else {
        next[key] = { ...(value as LocalActivityWordState), wordItemId: key };
      }
    }
    return next;
  } catch {
    return {};
  }
}

export function writeLocalActivityMap(
  studentId: string,
  activitySessionId: string,
  map: Record<string, LocalActivityWordState>,
): void {
  if (!canUseLocalStorage()) return;
  try {
    localStorage.setItem(
      getLocalActivityStorageKey(studentId, activitySessionId),
      JSON.stringify(map),
    );
  } catch {
    // ignore quota
  }
}

export function getLocalActivityWordState(
  studentId: string,
  activitySessionId: string,
  wordItemId: string,
): LocalActivityWordState | null {
  return readLocalActivityMap(studentId, activitySessionId)[wordItemId] ?? null;
}

export function upsertLocalActivityWordState(state: LocalActivityWordState): void {
  const map = readLocalActivityMap(state.studentId, state.activitySessionId);
  map[state.wordItemId] = state;
  writeLocalActivityMap(state.studentId, state.activitySessionId, map);
}

export function clearLocalActivitySession(
  studentId: string,
  activitySessionId: string,
): void {
  if (!canUseLocalStorage()) return;
  try {
    localStorage.removeItem(getLocalActivityStorageKey(studentId, activitySessionId));
  } catch {
    // ignore
  }
}
