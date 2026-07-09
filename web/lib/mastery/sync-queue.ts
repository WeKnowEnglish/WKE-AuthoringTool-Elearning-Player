import type { LearningEvidenceEvent, StudentMasteryRecord } from "@/lib/mastery/types";

export const MASTERY_SYNC_QUEUE_KEY = "wke-mastery-sync-queue-v1";
export const MAX_SYNC_QUEUE_ITEMS = 100;

export type MasterySyncQueueItem =
  | {
      kind: "evidence_push";
      schemaVersion: 1;
      studentId: string;
      enqueuedAt: string;
      evidence: LearningEvidenceEvent;
      masteryRecords: StudentMasteryRecord[];
    }
  | {
      kind: "mastery_batch";
      schemaVersion: 1;
      studentId: string;
      enqueuedAt: string;
      records: StudentMasteryRecord[];
    };

function canUseSessionStorage(): boolean {
  return typeof window !== "undefined" && !!window.sessionStorage;
}

export function getSyncQueueItemId(item: MasterySyncQueueItem): string {
  if (item.kind === "evidence_push") return item.evidence.id;
  return `mastery_batch:${item.enqueuedAt}`;
}

export function readSyncQueue(): MasterySyncQueueItem[] {
  if (!canUseSessionStorage()) return [];
  try {
    const raw = window.sessionStorage.getItem(MASTERY_SYNC_QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as MasterySyncQueueItem[]) : [];
  } catch {
    return [];
  }
}

export function writeSyncQueue(items: MasterySyncQueueItem[]): void {
  if (!canUseSessionStorage()) return;
  try {
    window.sessionStorage.setItem(MASTERY_SYNC_QUEUE_KEY, JSON.stringify(items));
  } catch {
    // ignore quota errors
  }
}

export function enqueueSyncItem(item: MasterySyncQueueItem): void {
  const itemId = getSyncQueueItemId(item);
  const queue = readSyncQueue().filter(
    (existing) =>
      !(existing.studentId === item.studentId && getSyncQueueItemId(existing) === itemId),
  );
  queue.push(item);
  while (queue.length > MAX_SYNC_QUEUE_ITEMS) {
    queue.shift();
  }
  writeSyncQueue(queue);
}

export function removeSyncItem(itemId: string, studentId: string): void {
  const queue = readSyncQueue().filter(
    (item) => !(item.studentId === studentId && getSyncQueueItemId(item) === itemId),
  );
  writeSyncQueue(queue);
}

export function clearSyncQueueForStudent(studentId: string): void {
  const queue = readSyncQueue().filter((item) => item.studentId !== studentId);
  writeSyncQueue(queue);
}

/** Test-only: clear the entire queue. */
export function clearAllSyncQueue(): void {
  if (!canUseSessionStorage()) return;
  try {
    window.sessionStorage.removeItem(MASTERY_SYNC_QUEUE_KEY);
  } catch {
    // ignore
  }
}

export function readSyncQueueForStudent(studentId: string): MasterySyncQueueItem[] {
  return readSyncQueue().filter((item) => item.studentId === studentId);
}
