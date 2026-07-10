import type { StudentMasteryRecord } from "@/lib/mastery/types";

export const MASTERY_UPSERT_DEBOUNCE_MS = 2000;

export type MasteryUpsertFlushHandler = (
  studentId: string,
  records: StudentMasteryRecord[],
) => Promise<void>;

const pendingByStudent = new Map<string, Map<string, StudentMasteryRecord>>();
const timersByStudent = new Map<string, ReturnType<typeof setTimeout>>();
let flushHandler: MasteryUpsertFlushHandler | null = null;

export function setMasteryUpsertFlushHandler(handler: MasteryUpsertFlushHandler | null): void {
  flushHandler = handler;
}

function getPendingMap(studentId: string): Map<string, StudentMasteryRecord> {
  let pending = pendingByStudent.get(studentId);
  if (!pending) {
    pending = new Map();
    pendingByStudent.set(studentId, pending);
  }
  return pending;
}

export function scheduleMasteryUpsert(studentId: string, record: StudentMasteryRecord): void {
  const pending = getPendingMap(studentId);
  pending.set(record.targetKey, record);

  const existingTimer = timersByStudent.get(studentId);
  if (existingTimer) clearTimeout(existingTimer);

  const timer = setTimeout(() => {
    timersByStudent.delete(studentId);
    void flushScheduledMasteryUpserts(studentId);
  }, MASTERY_UPSERT_DEBOUNCE_MS);

  timersByStudent.set(studentId, timer);
}

export async function flushScheduledMasteryUpserts(studentId: string): Promise<void> {
  const timer = timersByStudent.get(studentId);
  if (timer) {
    clearTimeout(timer);
    timersByStudent.delete(studentId);
  }

  const pending = pendingByStudent.get(studentId);
  if (!pending?.size || !flushHandler) return;

  const records = [...pending.values()];
  pending.clear();
  pendingByStudent.delete(studentId);

  await flushHandler(studentId, records);
}

export function clearScheduledMasteryUpserts(studentId: string): void {
  const timer = timersByStudent.get(studentId);
  if (timer) clearTimeout(timer);
  timersByStudent.delete(studentId);
  pendingByStudent.delete(studentId);
}

export function getScheduledMasteryUpsertCount(studentId: string): number {
  return pendingByStudent.get(studentId)?.size ?? 0;
}

export function getScheduledMasteryUpsertKeys(studentId: string): string[] {
  const pending = pendingByStudent.get(studentId);
  if (!pending) return [];
  return [...pending.keys()];
}

/** Test-only: clear all pending debounced upserts. */
export function clearAllScheduledMasteryUpserts(): void {
  for (const timer of timersByStudent.values()) {
    clearTimeout(timer);
  }
  timersByStudent.clear();
  pendingByStudent.clear();
}

/** Test-only reset. */
export function resetMasteryUpsertDebounceForTests(): void {
  clearAllScheduledMasteryUpserts();
}
