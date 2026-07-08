import {
  applyEvidenceToMasteryRecords,
  learningTargetKey,
} from "@/lib/mastery/engine";
import type { LearningEvidenceEvent, StudentMasteryRecord } from "@/lib/mastery/types";
import { scopedLocalStorageKey } from "@/lib/auth/scoped-local-storage";
import { resolveStudentStorageIdSync } from "@/lib/auth/student-storage-id";

export const MASTERY_STORAGE_KEY = "wke-student-mastery-v1";
export const MASTERY_EVIDENCE_STORAGE_KEY = "wke-learning-evidence-v1";

export type MasterySnapshot = {
  schemaVersion: 1;
  updatedAt: string;
  records: Record<string, StudentMasteryRecord>;
};

const EMPTY_SNAPSHOT: MasterySnapshot = {
  schemaVersion: 1,
  updatedAt: "",
  records: {},
};

const MAX_STORED_EVIDENCE = 500;

function hasLocalStorage(): boolean {
  return typeof window !== "undefined" && !!window.localStorage;
}

function masteryStorageKey(): string {
  return scopedLocalStorageKey(MASTERY_STORAGE_KEY, resolveStudentStorageIdSync());
}

function evidenceStorageKey(): string {
  return scopedLocalStorageKey(MASTERY_EVIDENCE_STORAGE_KEY, resolveStudentStorageIdSync());
}

export function readMasterySnapshot(): MasterySnapshot {
  if (!hasLocalStorage()) return EMPTY_SNAPSHOT;
  try {
    const raw = window.localStorage.getItem(masteryStorageKey());
    if (!raw) return EMPTY_SNAPSHOT;
    const parsed = JSON.parse(raw) as Partial<MasterySnapshot>;
    if (parsed.schemaVersion !== 1 || typeof parsed.records !== "object" || !parsed.records) {
      return EMPTY_SNAPSHOT;
    }
    return {
      schemaVersion: 1,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : "",
      records: parsed.records as Record<string, StudentMasteryRecord>,
    };
  } catch {
    return EMPTY_SNAPSHOT;
  }
}

export function writeMasterySnapshot(snapshot: MasterySnapshot): MasterySnapshot {
  if (!hasLocalStorage()) return snapshot;
  window.localStorage.setItem(masteryStorageKey(), JSON.stringify(snapshot));
  return snapshot;
}

export function readLearningEvidenceEvents(): LearningEvidenceEvent[] {
  if (!hasLocalStorage()) return [];
  try {
    const raw = window.localStorage.getItem(evidenceStorageKey());
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as LearningEvidenceEvent[]) : [];
  } catch {
    return [];
  }
}

export function recordLearningEvidenceEvent(
  evidence: LearningEvidenceEvent,
): MasterySnapshot {
  if (!hasLocalStorage()) return readMasterySnapshot();
  const evidenceEvents = [...readLearningEvidenceEvents(), evidence].slice(-MAX_STORED_EVIDENCE);
  window.localStorage.setItem(evidenceStorageKey(), JSON.stringify(evidenceEvents));
  const current = readMasterySnapshot();
  const next: MasterySnapshot = {
    schemaVersion: 1,
    updatedAt: evidence.occurredAt,
    records: applyEvidenceToMasteryRecords(current.records, evidence),
  };
  return writeMasterySnapshot(next);
}

export function getMasteryRecordForTarget(
  target: Parameters<typeof learningTargetKey>[0],
): StudentMasteryRecord | null {
  return readMasterySnapshot().records[learningTargetKey(target)] ?? null;
}

