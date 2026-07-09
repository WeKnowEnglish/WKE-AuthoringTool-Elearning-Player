"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getCachedAuthUserId,
  resolveStudentStorageIdSync,
} from "@/lib/auth/student-storage-id";
import { scopedLocalStorageKey } from "@/lib/auth/scoped-local-storage";
import {
  MASTERY_EVIDENCE_STORAGE_KEY,
  MASTERY_STORAGE_KEY,
  readLearningEvidenceEvents,
  readMasterySnapshot,
  type MasterySnapshot,
} from "@/lib/mastery/local-storage";
import {
  getScheduledMasteryUpsertCount,
  getScheduledMasteryUpsertKeys,
  MASTERY_UPSERT_DEBOUNCE_MS,
} from "@/lib/mastery/mastery-upsert-debounce";
import { diffMasterySnapshotsForDebug } from "@/lib/mastery/mastery-snapshot-diff";
import {
  getMasteryHydrationDebugState,
  pullMasterySnapshotFromServer,
} from "@/lib/mastery/supabase-sync";
import {
  getSyncQueueItemId,
  MAX_SYNC_QUEUE_ITEMS,
  readSyncQueue,
  readSyncQueueForStudent,
} from "@/lib/mastery/sync-queue";
import {
  readSyncDebugEvents,
  subscribeSyncDebugEvents,
  type MasterySyncDebugEvent,
} from "@/lib/mastery/sync-debug-log";
import { createClient } from "@/lib/supabase/client";
import type { StudentMasteryRecord } from "@/lib/mastery/types";

const POLL_MS = 2000;
const MAX_EVIDENCE = 500;

type ServerFetchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ok"; snapshot: MasterySnapshot; fetchedAt: string };

function topRecordsByLowestScore(
  records: Record<string, StudentMasteryRecord>,
  limit: number,
): StudentMasteryRecord[] {
  return Object.values(records)
    .sort((a, b) => a.masteryScore - b.masteryScore)
    .slice(0, limit);
}

function formatTime(iso: string): string {
  if (!iso) return "—";
  const date = new Date(iso);
  return Number.isFinite(date.getTime()) ? date.toLocaleTimeString() : iso;
}

function DiffBucket({
  label,
  keys,
}: {
  label: string;
  keys: string[];
}) {
  if (!keys.length) return null;
  return (
    <div className="mt-1">
      <p className="font-medium text-slate-700">
        {label} ({keys.length})
      </p>
      <p className="break-all text-slate-600">{keys.slice(0, 10).join(", ")}</p>
      {keys.length > 10 ? <p className="text-slate-500">+{keys.length - 10} more</p> : null}
    </div>
  );
}

function EventRow({ event }: { event: MasterySyncDebugEvent }) {
  const levelClass =
    event.level === "error"
      ? "text-red-700"
      : event.level === "warn"
        ? "text-amber-700"
        : "text-slate-700";

  return (
    <li className={`border-b border-slate-100 py-1 ${levelClass}`}>
      <span className="text-slate-500">{formatTime(event.at)}</span>{" "}
      <span className="font-medium">{event.op}</span> — {event.message}
      {event.detail ? <span className="block break-all text-slate-500">{event.detail}</span> : null}
    </li>
  );
}

export function MasterySyncDebugPanel() {
  const [collapsed, setCollapsed] = useState(false);
  const [tick, setTick] = useState(0);
  const [events, setEvents] = useState<MasterySyncDebugEvent[]>(() => readSyncDebugEvents());
  const [serverFetch, setServerFetch] = useState<ServerFetchState>({ status: "idle" });
  const [online, setOnline] = useState(true);
  const [visibility, setVisibility] = useState<DocumentVisibilityState>("visible");

  const refresh = useCallback(() => {
    setTick((value) => value + 1);
    setEvents(readSyncDebugEvents());
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeSyncDebugEvents(() => {
      setEvents(readSyncDebugEvents());
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const onOnline = () => setOnline(navigator.onLine);
    const onVisibility = () => setVisibility(document.visibilityState);
    onOnline();
    onVisibility();
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOnline);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOnline);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  useEffect(() => {
    const id = window.setInterval(refresh, POLL_MS);
    return () => window.clearInterval(id);
  }, [refresh]);

  const authUserId = getCachedAuthUserId();
  const storageId = resolveStudentStorageIdSync();
  const isGuest = !authUserId;
  const localSnapshot = readMasterySnapshot();
  const evidence = readLearningEvidenceEvents();
  const hydration = getMasteryHydrationDebugState();
  const queueAll = readSyncQueue();
  const queueForStudent = authUserId ? readSyncQueueForStudent(authUserId) : [];
  const debounceCount = authUserId ? getScheduledMasteryUpsertCount(authUserId) : 0;
  const debounceKeys = authUserId ? getScheduledMasteryUpsertKeys(authUserId) : [];

  const queueBreakdown = useMemo(() => {
    let evidencePush = 0;
    let masteryBatch = 0;
    for (const item of queueForStudent) {
      if (item.kind === "evidence_push") evidencePush += 1;
      else masteryBatch += 1;
    }
    return { evidencePush, masteryBatch };
  }, [queueForStudent, tick]);

  const weakRecords = useMemo(
    () => topRecordsByLowestScore(localSnapshot.records, 5),
    [localSnapshot.records, tick],
  );

  const diff = useMemo(() => {
    if (serverFetch.status !== "ok") return null;
    return diffMasterySnapshotsForDebug(localSnapshot, serverFetch.snapshot);
  }, [localSnapshot, serverFetch, tick]);

  const masteryKey = scopedLocalStorageKey(MASTERY_STORAGE_KEY, storageId);
  const evidenceKey = scopedLocalStorageKey(MASTERY_EVIDENCE_STORAGE_KEY, storageId);

  const fetchServer = async () => {
    if (!authUserId) return;
    setServerFetch({ status: "loading" });
    try {
      const supabase = createClient();
      const snapshot = await pullMasterySnapshotFromServer(supabase, authUserId);
      if (!snapshot) {
        setServerFetch({ status: "error", message: "Pull returned null (auth or RLS)" });
        return;
      }
      setServerFetch({
        status: "ok",
        snapshot,
        fetchedAt: new Date().toISOString(),
      });
    } catch (error) {
      setServerFetch({
        status: "error",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const serverRecordCount =
    serverFetch.status === "ok" ? Object.keys(serverFetch.snapshot.records).length : null;

  return (
    <div
      className="fixed bottom-3 right-3 z-50 w-[min(100vw-1.5rem,26rem)] rounded-lg border border-slate-400 bg-white text-xs text-slate-900 shadow-lg"
      data-testid="mastery-sync-debug-panel"
    >
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 border-b border-slate-200 px-3 py-2 text-left font-bold"
        onClick={() => setCollapsed((value) => !value)}
      >
        <span>Mastery sync (D1)</span>
        <span className="flex items-center gap-2 font-normal">
          <span
            className={`rounded px-1.5 py-0.5 ${online ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}
          >
            {online ? "online" : "offline"}
          </span>
          {queueForStudent.length > 0 ? (
            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-amber-900">
              queue {queueForStudent.length}
            </span>
          ) : null}
          <span className="text-slate-500">{collapsed ? "▸" : "▾"}</span>
        </span>
      </button>

      {!collapsed ? (
        <div className="max-h-[70vh] space-y-3 overflow-y-auto px-3 py-2">
          <section>
            <p className="font-bold text-slate-800">Auth & environment</p>
            <dl className="mt-1 space-y-0.5 text-slate-700">
              <div className="flex justify-between gap-2">
                <dt>Mode</dt>
                <dd>{isGuest ? "guest" : "authenticated"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>storageId</dt>
                <dd className="max-w-[14rem] truncate font-mono" title={storageId}>
                  {storageId}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>authUserId</dt>
                <dd className="max-w-[14rem] truncate font-mono" title={authUserId ?? "—"}>
                  {authUserId ?? "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>Hydration memo</dt>
                <dd>
                  {hydration.lastHydratedStudentId ?? "—"}
                  {authUserId && hydration.lastHydratedStudentId === authUserId ? " ✓" : ""}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>Queue flush</dt>
                <dd>{hydration.flushQueueInflight ? "in flight" : "idle"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>Visibility</dt>
                <dd>{visibility}</dd>
              </div>
            </dl>
            <p className="mt-1 break-all font-mono text-[10px] text-slate-500">{masteryKey}</p>
            <p className="break-all font-mono text-[10px] text-slate-500">{evidenceKey}</p>
          </section>

          <section>
            <p className="font-bold text-slate-800">Local snapshot</p>
            <p>
              {Object.keys(localSnapshot.records).length} records · evidence {evidence.length}/
              {MAX_EVIDENCE}
            </p>
            <p className="text-slate-600">updatedAt: {localSnapshot.updatedAt || "—"}</p>
            {weakRecords.length > 0 ? (
              <ul className="mt-1 space-y-0.5">
                {weakRecords.map((record) => (
                  <li key={record.targetKey} className="font-mono text-[11px]">
                    {record.targetKey} · {record.state} · {Math.round(record.masteryScore * 100)}%
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-500">No local records</p>
            )}
          </section>

          <section>
            <div className="flex items-center justify-between gap-2">
              <p className="font-bold text-slate-800">Server snapshot</p>
              <button
                type="button"
                className="rounded border border-slate-300 px-2 py-0.5 text-[11px] hover:bg-slate-50 disabled:opacity-50"
                disabled={isGuest || serverFetch.status === "loading"}
                onClick={() => void fetchServer()}
              >
                {serverFetch.status === "loading" ? "Fetching…" : "Fetch server"}
              </button>
            </div>
            {isGuest ? (
              <p className="text-slate-500">Sign in to fetch server</p>
            ) : serverFetch.status === "idle" ? (
              <p className="text-slate-500">On-demand only — click Fetch server</p>
            ) : serverFetch.status === "error" ? (
              <p className="text-red-700">{serverFetch.message}</p>
            ) : serverFetch.status === "ok" ? (
              <p>
                {serverRecordCount} records · fetched {formatTime(serverFetch.fetchedAt)} ·
                updatedAt {serverFetch.snapshot.updatedAt || "—"}
              </p>
            ) : null}
          </section>

          {diff ? (
            <section>
              <p className="font-bold text-slate-800">Local vs server diff</p>
              <DiffBucket label="only local" keys={diff.onlyLocal} />
              <DiffBucket label="only server" keys={diff.onlyServer} />
              <DiffBucket label="local newer" keys={diff.localNewer} />
              <DiffBucket label="server newer" keys={diff.serverNewer} />
              <DiffBucket label="in sync" keys={diff.inSync} />
            </section>
          ) : null}

          <section>
            <p className="font-bold text-slate-800">Retry queue</p>
            <p>
              student {queueForStudent.length} / total {queueAll.length} (cap {MAX_SYNC_QUEUE_ITEMS})
            </p>
            <p className="text-slate-600">
              evidence_push {queueBreakdown.evidencePush} · mastery_batch{" "}
              {queueBreakdown.masteryBatch}
            </p>
            {queueForStudent.length > 0 ? (
              <ul className="mt-1 max-h-24 overflow-y-auto font-mono text-[10px]">
                {queueForStudent.slice(-10).map((item) => (
                  <li key={getSyncQueueItemId(item)} className="border-b border-slate-100 py-0.5">
                    {item.kind} · {formatTime(item.enqueuedAt)}
                    {item.kind === "evidence_push"
                      ? ` · ${item.evidence.id}`
                      : ` · ${item.records.length} records`}
                  </li>
                ))}
              </ul>
            ) : null}
          </section>

          <section>
            <p className="font-bold text-slate-800">Debounce</p>
            <p>
              pending {debounceCount} · window {MASTERY_UPSERT_DEBOUNCE_MS}ms
            </p>
            {debounceKeys.length > 0 ? (
              <p className="break-all font-mono text-[10px] text-slate-600">
                {debounceKeys.slice(0, 10).join(", ")}
              </p>
            ) : null}
          </section>

          <section>
            <div className="flex items-center justify-between gap-2">
              <p className="font-bold text-slate-800">Event log</p>
              <button
                type="button"
                className="rounded border border-slate-300 px-2 py-0.5 text-[11px] hover:bg-slate-50"
                onClick={refresh}
              >
                Refresh
              </button>
            </div>
            {events.length > 0 ? (
              <ul className="mt-1 max-h-32 overflow-y-auto">
                {events.map((event, index) => (
                  <EventRow key={`${event.at}-${index}`} event={event} />
                ))}
              </ul>
            ) : (
              <p className="text-slate-500">No sync events yet</p>
            )}
          </section>

          <p className="border-t border-slate-200 pt-2 text-[10px] text-slate-500">
            D1a read-only · manual actions in D1b
          </p>
        </div>
      ) : null}
    </div>
  );
}
