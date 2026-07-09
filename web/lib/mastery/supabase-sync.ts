import type { SupabaseClient } from "@supabase/supabase-js";
import { getCachedAuthUserId } from "@/lib/auth/student-storage-id";
import { learningTargetKey } from "@/lib/mastery/engine";
import {
  flushScheduledMasteryUpserts,
  scheduleMasteryUpsert,
  setMasteryUpsertFlushHandler,
  clearScheduledMasteryUpserts,
  clearAllScheduledMasteryUpserts,
} from "@/lib/mastery/mastery-upsert-debounce";
import {
  readMasterySnapshot,
  writeMasterySnapshot,
  type MasterySnapshot,
} from "@/lib/mastery/local-storage";
import {
  enqueueSyncItem,
  getSyncQueueItemId,
  readSyncQueueForStudent,
  removeSyncItem,
  clearSyncQueueForStudent,
  clearAllSyncQueue,
  type MasterySyncQueueItem,
} from "@/lib/mastery/sync-queue";
import { appendSyncDebugEvent } from "@/lib/mastery/sync-debug-log";
import {
  evidenceEventToRow,
  masteryRecordToRow,
  rowToMasteryRecord,
  type StudentMasteryRecordRow,
} from "@/lib/mastery/supabase-rows";
import type { LearningEvidenceEvent, StudentMasteryRecord } from "@/lib/mastery/types";
import { createClient } from "@/lib/supabase/client";

const SYNC_LOG_PREFIX = "[mastery-sync]";
const MAX_QUEUE_FLUSH_ATTEMPTS = 3;

const inflightByStudent = new Map<string, Promise<void>>();
let lastHydratedStudentId: string | null = null;
let flushQueueInflight: Promise<void> | null = null;
const flushAttempts = new Map<string, number>();

function syncDebug(
  level: "info" | "warn" | "error",
  op: Parameters<typeof appendSyncDebugEvent>[0]["op"],
  message: string,
  detail?: string,
): void {
  appendSyncDebugEvent({ level, op, message, detail });
}

export function getMasteryHydrationDebugState(): {
  lastHydratedStudentId: string | null;
  flushQueueInflight: boolean;
} {
  return {
    lastHydratedStudentId,
    flushQueueInflight: flushQueueInflight !== null,
  };
}

function parseUpdatedAt(iso: string): number {
  const parsed = Date.parse(iso);
  return Number.isFinite(parsed) ? parsed : 0;
}

function snapshotUpdatedAt(records: Record<string, StudentMasteryRecord>): string {
  let latest = "";
  for (const record of Object.values(records)) {
    if (record.updatedAt > latest) latest = record.updatedAt;
  }
  return latest;
}

/** Pure merge — per target_key, newer `updatedAt` wins; ties go to server. */
export function mergeMasterySnapshots(
  local: MasterySnapshot,
  server: MasterySnapshot,
): MasterySnapshot {
  const records: Record<string, StudentMasteryRecord> = { ...local.records };

  for (const [key, serverRecord] of Object.entries(server.records)) {
    const localRecord = records[key];
    if (!localRecord) {
      records[key] = serverRecord;
      continue;
    }

    const localTime = parseUpdatedAt(localRecord.updatedAt);
    const serverTime = parseUpdatedAt(serverRecord.updatedAt);
    records[key] = serverTime >= localTime ? serverRecord : localRecord;
  }

  return {
    schemaVersion: 1,
    updatedAt: snapshotUpdatedAt(records),
    records,
  };
}

export async function pullMasterySnapshotFromServer(
  supabase: SupabaseClient,
  studentId: string,
): Promise<MasterySnapshot | null> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user?.id || user.id !== studentId) {
    return null;
  }

  const { data, error } = await supabase
    .from("student_mastery_records")
    .select("id, student_id, target_key, target_type, record, updated_at, created_at")
    .eq("student_id", studentId);

  if (error) {
    console.warn(`${SYNC_LOG_PREFIX} pull failed`, error.message);
    syncDebug("warn", "pull", "Pull failed", error.message);
    return null;
  }

  if (!data?.length) {
    syncDebug("info", "pull", "Pull returned empty snapshot");
    return { schemaVersion: 1, updatedAt: "", records: {} };
  }

  const records: Record<string, StudentMasteryRecord> = {};

  for (const raw of data) {
    const row = raw as StudentMasteryRecordRow;
    if (typeof row.target_key !== "string" || !row.target_key || !row.record) {
      continue;
    }
    try {
      records[row.target_key] = rowToMasteryRecord(row);
    } catch {
      console.warn(`${SYNC_LOG_PREFIX} skipped malformed row`, row.target_key);
    }
  }

  const recordCount = Object.keys(records).length;
  syncDebug("info", "pull", `Pull ok (${recordCount} records)`);

  return {
    schemaVersion: 1,
    updatedAt: snapshotUpdatedAt(records),
    records,
  };
}

export async function hydrateLocalMasteryFromServer(
  supabase: SupabaseClient,
  studentId: string,
): Promise<MasterySnapshot> {
  const local = readMasterySnapshot();
  const server = await pullMasterySnapshotFromServer(supabase, studentId);
  if (!server) return local;

  const merged = mergeMasterySnapshots(local, server);
  const written = writeMasterySnapshot(merged);
  syncDebug(
    "info",
    "hydrate",
    `Hydrate merged (${Object.keys(written.records).length} local records)`,
  );
  return written;
}

/** Test-only reset for hydration memo, queue attempts, and in-flight pulls. */
export function resetMasteryHydrationMemo(): void {
  inflightByStudent.clear();
  lastHydratedStudentId = null;
  flushQueueInflight = null;
  flushAttempts.clear();
}

/** Test-only: reset all sync-side state. */
export function resetMasterySyncStateForTests(): void {
  resetMasteryHydrationMemo();
  clearAllSyncQueue();
  clearAllScheduledMasteryUpserts();
}

/**
 * Pull server mastery into scoped localStorage for the authenticated student.
 * No-op for guests. Dedupes in-flight calls; hydrates once per page session per student.
 */
export async function ensureMasteryHydratedForCurrentStudent(): Promise<void> {
  const studentId = getCachedAuthUserId();
  if (!studentId) return;

  if (lastHydratedStudentId === studentId) {
    const inflight = inflightByStudent.get(studentId);
    if (inflight) await inflight;
    await flushMasterySyncQueueForCurrentStudent();
    return;
  }

  let inflight = inflightByStudent.get(studentId);
  if (!inflight) {
    inflight = (async () => {
      try {
        const supabase = createClient();
        await hydrateLocalMasteryFromServer(supabase, studentId);
        lastHydratedStudentId = studentId;
        await flushMasterySyncQueueForCurrentStudent();
      } catch (error) {
        console.warn(`${SYNC_LOG_PREFIX} hydrate failed`, error);
        syncDebug(
          "error",
          "hydrate",
          "Hydrate failed",
          error instanceof Error ? error.message : String(error),
        );
      } finally {
        inflightByStudent.delete(studentId);
      }
    })();
    inflightByStudent.set(studentId, inflight);
  }

  await inflight;
}

export function affectedTargetKeys(evidence: LearningEvidenceEvent): string[] {
  const refs = [...evidence.targetRefs, ...(evidence.skillRefs ?? [])];
  return [...new Set(refs.map(learningTargetKey))];
}

function isUniqueViolation(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === "23505" || /duplicate key/i.test(error.message ?? "");
}

function masteryRecordsFromSnapshot(
  snapshot: MasterySnapshot,
  evidence: LearningEvidenceEvent,
): StudentMasteryRecord[] {
  return affectedTargetKeys(evidence)
    .map((targetKey) => snapshot.records[targetKey])
    .filter((record): record is StudentMasteryRecord => !!record);
}

async function upsertMasteryRecord(
  supabase: SupabaseClient,
  studentId: string,
  record: StudentMasteryRecord,
): Promise<void> {
  const { error } = await supabase
    .from("student_mastery_records")
    .upsert(masteryRecordToRow(studentId, record), { onConflict: "student_id,target_key" });

  if (error) {
    throw error;
  }
}

async function upsertMasteryRecords(
  supabase: SupabaseClient,
  studentId: string,
  records: StudentMasteryRecord[],
): Promise<void> {
  if (!records.length) return;
  await Promise.all(records.map((record) => upsertMasteryRecord(supabase, studentId, record)));
}

async function insertEvidenceRow(
  supabase: SupabaseClient,
  studentId: string,
  evidence: LearningEvidenceEvent,
): Promise<"ok" | "duplicate" | "failed"> {
  const { error } = await supabase
    .from("student_learning_evidence")
    .insert(evidenceEventToRow(studentId, evidence));

  if (!error) return "ok";
  if (isUniqueViolation(error)) {
    syncDebug("info", "evidence_push", "Evidence duplicate (skipped)", evidence.id);
    return "duplicate";
  }
  console.warn(`${SYNC_LOG_PREFIX} evidence push failed`, error.message);
  syncDebug("warn", "evidence_push", "Evidence push failed", error.message);
  return "failed";
}

function enqueueEvidencePush(
  studentId: string,
  evidence: LearningEvidenceEvent,
  masteryRecords: StudentMasteryRecord[],
): void {
  enqueueSyncItem({
    kind: "evidence_push",
    schemaVersion: 1,
    studentId,
    enqueuedAt: new Date().toISOString(),
    evidence,
    masteryRecords,
  });
  syncDebug(
    "info",
    "queue_enqueue",
    "Queued evidence push",
    `${evidence.id} (${masteryRecords.length} records)`,
  );
}

function enqueueMasteryBatch(studentId: string, records: StudentMasteryRecord[]): void {
  if (!records.length) return;
  enqueueSyncItem({
    kind: "mastery_batch",
    schemaVersion: 1,
    studentId,
    enqueuedAt: new Date().toISOString(),
    records,
  });
  syncDebug(
    "info",
    "queue_enqueue",
    "Queued mastery batch",
    `${records.length} records`,
  );
}

async function replayQueueItem(
  supabase: SupabaseClient,
  studentId: string,
  item: MasterySyncQueueItem,
): Promise<boolean> {
  if (item.studentId !== studentId) return false;

  if (item.kind === "evidence_push") {
    const evidenceResult = await insertEvidenceRow(supabase, studentId, item.evidence);
    if (evidenceResult === "failed") return false;
    try {
      await upsertMasteryRecords(supabase, studentId, item.masteryRecords);
      return true;
    } catch (error) {
      console.warn(`${SYNC_LOG_PREFIX} queue mastery replay failed`, error);
      return false;
    }
  }

  try {
    await upsertMasteryRecords(supabase, studentId, item.records);
    return true;
  } catch (error) {
    console.warn(`${SYNC_LOG_PREFIX} queue batch replay failed`, error);
    return false;
  }
}

export async function flushMasterySyncQueueForCurrentStudent(): Promise<void> {
  const studentId = getCachedAuthUserId();
  if (!studentId) return;

  if (flushQueueInflight) {
    await flushQueueInflight;
    return;
  }

  flushQueueInflight = (async () => {
    try {
      const supabase = createClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user?.id || user.id !== studentId) return;

      const queue = readSyncQueueForStudent(studentId);
      if (!queue.length) return;

      syncDebug("info", "queue_flush", `Flushing queue (${queue.length} items)`);
      let flushed = 0;

      for (const item of queue) {
        const itemId = getSyncQueueItemId(item);
        const attempts = flushAttempts.get(itemId) ?? 0;
        if (attempts >= MAX_QUEUE_FLUSH_ATTEMPTS) continue;

        const ok = await replayQueueItem(supabase, studentId, item);
        if (ok) {
          removeSyncItem(itemId, studentId);
          flushAttempts.delete(itemId);
          flushed += 1;
        } else {
          flushAttempts.set(itemId, attempts + 1);
        }
      }

      const remaining = readSyncQueueForStudent(studentId).length;
      syncDebug(
        remaining ? "warn" : "info",
        "queue_flush",
        `Queue flush done (${flushed} ok, ${remaining} remaining)`,
      );
    } catch (error) {
      console.warn(`${SYNC_LOG_PREFIX} queue flush failed`, error);
      syncDebug(
        "error",
        "queue_flush",
        "Queue flush failed",
        error instanceof Error ? error.message : String(error),
      );
    } finally {
      flushQueueInflight = null;
    }
  })();

  await flushQueueInflight;
}

/** Push one evidence event and schedule debounced mastery upserts (authenticated only). */
export async function pushEvidenceAndMasteryToServer(
  evidence: LearningEvidenceEvent,
  snapshot: MasterySnapshot,
): Promise<void> {
  await flushMasterySyncQueueForCurrentStudent();

  const supabase = createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user?.id || user.id !== evidence.studentId) {
    return;
  }

  const studentId = user.id;
  const masteryRecords = masteryRecordsFromSnapshot(snapshot, evidence);

  const evidenceResult = await insertEvidenceRow(supabase, studentId, evidence);
  if (evidenceResult === "duplicate") {
    removeSyncItem(evidence.id, studentId);
  } else if (evidenceResult === "failed") {
    enqueueEvidencePush(studentId, evidence, masteryRecords);
  } else {
    syncDebug("info", "evidence_push", "Evidence pushed", evidence.id);
  }

  for (const record of masteryRecords) {
    scheduleMasteryUpsert(studentId, record);
  }
}

/** Upsert all local mastery records after guest → account migrate. */
export async function pushLocalMasteryBacklog(
  supabase: SupabaseClient,
  studentId: string,
): Promise<void> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user?.id || user.id !== studentId) {
    return;
  }

  const records = Object.values(readMasterySnapshot().records);
  if (!records.length) return;

  try {
    await upsertMasteryRecords(supabase, studentId, records);
    syncDebug("info", "backlog", `Backlog pushed (${records.length} records)`);
  } catch (error) {
    console.warn(`${SYNC_LOG_PREFIX} backlog push failed`, error);
    syncDebug(
      "warn",
      "backlog",
      "Backlog push failed",
      error instanceof Error ? error.message : String(error),
    );
    enqueueMasteryBatch(studentId, records);
  }
}

export async function pushLocalMasteryBacklogForCurrentStudent(): Promise<void> {
  const studentId = getCachedAuthUserId();
  if (!studentId) return;

  try {
    const supabase = createClient();
    await pushLocalMasteryBacklog(supabase, studentId);
  } catch (error) {
    console.warn(`${SYNC_LOG_PREFIX} backlog push failed`, error);
  }
}

/** Best-effort sync cleanup before student sign-out (2s cap). */
export async function signOutMasterySyncCleanup(): Promise<void> {
  const studentId = getCachedAuthUserId();
  if (!studentId) {
    resetMasteryHydrationMemo();
    return;
  }

  await Promise.race([
    (async () => {
      await flushScheduledMasteryUpserts(studentId);
      await flushMasterySyncQueueForCurrentStudent();
    })(),
    new Promise<void>((resolve) => {
      setTimeout(resolve, 2000);
    }),
  ]);

  clearSyncQueueForStudent(studentId);
  clearScheduledMasteryUpserts(studentId);
  resetMasteryHydrationMemo();
}

setMasteryUpsertFlushHandler(async (studentId, records) => {
  const supabase = createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user?.id || user.id !== studentId) return;

  try {
    await upsertMasteryRecords(supabase, studentId, records);
    syncDebug("info", "debounce_flush", `Debounced upsert ok (${records.length} records)`);
  } catch (error) {
    console.warn(`${SYNC_LOG_PREFIX} debounced mastery push failed`, error);
    syncDebug(
      "warn",
      "debounce_flush",
      "Debounced upsert failed",
      error instanceof Error ? error.message : String(error),
    );
    enqueueMasteryBatch(studentId, records);
  }
});
