import "server-only";

import type { ClassroomRuntimeSnapshot } from "@/lib/classroom-realtime/types";
import { createEmptyRandomiser } from "@/lib/virtual-classroom/tools/dice";
import { createEmptyGroupSet } from "@/lib/virtual-classroom/tools/groups";
import { createEmptyPickerState } from "@/lib/virtual-classroom/tools/picker";
import { createEmptySessionPoints } from "@/lib/virtual-classroom/tools/points";
import { createEmptyClassroomStatus } from "@/lib/virtual-classroom/tools/status";
import { createIdleGlobalTimer } from "@/lib/virtual-classroom/tools/timer";
import { createServiceRoleSupabase } from "@/lib/supabase/service-role-client";
import { getLiveblocksServerClient } from "@/lib/live-game/server/liveblocks-client";
import { snapshotEvent } from "@/lib/classroom-realtime/events";
import { broadcastClassroomRuntimeUpdate } from "@/lib/classroom-realtime/server/broadcast";

type RuntimeSnapshotRow = {
  session_id: string;
  state_version: number;
  snapshot_json: ClassroomRuntimeSnapshot;
  updated_at: string;
  updated_by: string;
};

function mapRow(row: RuntimeSnapshotRow): ClassroomRuntimeSnapshot {
  return {
    ...row.snapshot_json,
    sessionId: row.session_id,
    stateVersion: row.state_version,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
  };
}

/**
 * Initial durable control-plane state.  This mirrors the existing Liveblocks
 * runtime defaults but does not yet drive the classroom UI.
 */
export function createInitialClassroomRuntimeSnapshot(input: {
  sessionId: string;
  actorUserId: string;
  now?: Date;
}): ClassroomRuntimeSnapshot {
  const now = input.now ?? new Date();
  return {
    sessionId: input.sessionId,
    stateVersion: 1,
    status: "active",
    uiMode: "meeting",
    learnStage: "whiteboard",
    learnStudentPensEnabled: true,
    announcement: null,
    activeActivity: {
      kind: null,
      joinCode: null,
      label: null,
      roundId: null,
      roomId: null,
    },
    tools: {
      picker: createEmptyPickerState([]),
      groupSet: createEmptyGroupSet(),
      timer: createIdleGlobalTimer(60_000),
      randomiser: createEmptyRandomiser(),
      points: createEmptySessionPoints(),
      classroomStatus: createEmptyClassroomStatus(),
    },
    updatedAt: now.toISOString(),
    updatedBy: input.actorUserId,
  };
}

/**
 * Seeds a session snapshot without replacing an existing one.  During the
 * migration this is deliberately best-effort: Liveblocks is still the live UI
 * source of truth and a local install may not have the new migration applied.
 */
export async function seedClassroomRuntimeSnapshot(
  snapshot: ClassroomRuntimeSnapshot,
): Promise<{ ok: true; snapshot: ClassroomRuntimeSnapshot } | { ok: false; error: string }> {
  const supabase = createServiceRoleSupabase();
  if (!supabase) return { ok: false, error: "Service-role Supabase is not configured." };

  const { data, error } = await supabase
    .from("class_session_runtime_snapshots")
    .upsert(
      {
        session_id: snapshot.sessionId,
        state_version: snapshot.stateVersion,
        snapshot_json: snapshot,
        updated_at: snapshot.updatedAt,
        updated_by: snapshot.updatedBy,
      },
      { onConflict: "session_id", ignoreDuplicates: true },
    )
    .select("session_id, state_version, snapshot_json, updated_at, updated_by")
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (data) return { ok: true, snapshot: mapRow(data as RuntimeSnapshotRow) };

  const existing = await getClassroomRuntimeSnapshot(snapshot.sessionId);
  return existing
    ? { ok: true, snapshot: existing }
    : { ok: false, error: "Runtime snapshot was not created." };
}

export async function getClassroomRuntimeSnapshot(
  sessionId: string,
): Promise<ClassroomRuntimeSnapshot | null> {
  const supabase = createServiceRoleSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("class_session_runtime_snapshots")
    .select("session_id, state_version, snapshot_json, updated_at, updated_by")
    .eq("session_id", sessionId)
    .maybeSingle();
  if (error || !data) return null;
  return mapRow(data as RuntimeSnapshotRow);
}

function objectOrNull(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readRuntimeFromStorage(storage: unknown): Record<string, unknown> | null {
  const root = objectOrNull(storage);
  const nested = objectOrNull(root?.data);
  return objectOrNull(nested?.runtime) ?? objectOrNull(root?.runtime);
}

/** Converts the current Liveblocks JSON document into the provider-neutral recovery snapshot. */
export function mergeLiveblocksRuntimeIntoSnapshot(input: {
  current: ClassroomRuntimeSnapshot;
  runtime: Record<string, unknown>;
  actorUserId: string;
  now?: Date;
}): ClassroomRuntimeSnapshot {
  const activity = objectOrNull(input.runtime.activeActivity);
  const tools = { ...input.current.tools };
  for (const key of ["picker", "groupSet", "timer", "randomiser", "points", "classroomStatus"]) {
    if (input.runtime[key] !== undefined) tools[key] = input.runtime[key];
  }
  const now = input.now ?? new Date();
  return {
    ...input.current,
    status: input.runtime.status === "ended" ? "ended" : "active",
    uiMode: input.runtime.uiMode === "learn" ? "learn" : "meeting",
    learnStage: input.runtime.learnStage === "activity" ? "activity" : "whiteboard",
    learnStudentPensEnabled: input.runtime.learnStudentPensEnabled !== false,
    announcement: typeof input.runtime.announcement === "string" ? input.runtime.announcement : null,
    activeActivity: {
      kind:
        activity?.kind === "whiteboard" || activity?.kind === "document" || activity?.kind === "word_cards"
          ? activity.kind
          : null,
      joinCode: typeof activity?.joinCode === "string" ? activity.joinCode : null,
      label: typeof activity?.label === "string" ? activity.label : null,
      roundId: typeof activity?.roundId === "string" ? activity.roundId : null,
      roomId: typeof activity?.roomId === "string" ? activity.roomId : null,
    },
    tools,
    updatedAt: now.toISOString(),
    updatedBy: input.actorUserId,
  };
}

const RUNTIME_COMPARISON_KEYS = [
  "status",
  "uiMode",
  "learnStage",
  "learnStudentPensEnabled",
  "announcement",
  "activeActivity",
  "tools",
] as const;

function valuesMatch(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

/**
 * Returns the durable control-plane fields that differ from a completed
 * Liveblocks runtime. Metadata and participant presence are intentionally
 * excluded: neither belongs in the recovery state.
 */
export function findClassroomRuntimeSnapshotDrift(input: {
  snapshot: ClassroomRuntimeSnapshot;
  runtime: Record<string, unknown>;
}): string[] {
  const projected = mergeLiveblocksRuntimeIntoSnapshot({
    current: input.snapshot,
    runtime: input.runtime,
    actorUserId: input.snapshot.updatedBy,
    now: new Date(input.snapshot.updatedAt),
  });
  return RUNTIME_COMPARISON_KEYS.filter(
    (key) => !valuesMatch(input.snapshot[key], projected[key]),
  );
}

/**
 * Host-only pilot diagnostic. It does not mutate either transport and is used
 * to prove that the recovery snapshot remains suitable for a later cutover.
 */
export async function verifyClassroomRuntimeSnapshot(input: {
  sessionId: string;
  roomId: string;
}): Promise<
  | { ok: true; stateVersion: number; driftedFields: string[] }
  | { ok: false; error: string }
> {
  const snapshot = await getClassroomRuntimeSnapshot(input.sessionId);
  if (!snapshot) return { ok: false, error: "Runtime snapshot is not available yet." };
  try {
    const storage = await getLiveblocksServerClient().getStorageDocument(input.roomId, "json");
    const runtime = readRuntimeFromStorage(storage);
    if (!runtime) return { ok: false, error: "Live classroom runtime is unavailable." };
    return {
      ok: true,
      stateVersion: snapshot.stateVersion,
      driftedFields: findClassroomRuntimeSnapshotDrift({ snapshot, runtime }),
    };
  } catch {
    return { ok: false, error: "Could not verify the live classroom runtime." };
  }
}

async function advanceClassroomRuntimeSnapshot(input: {
  expectedVersion: number;
  snapshot: ClassroomRuntimeSnapshot;
  actorUserId: string;
}): Promise<ClassroomRuntimeSnapshot | null> {
  const supabase = createServiceRoleSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .rpc("advance_class_session_runtime_snapshot", {
      p_session_id: input.snapshot.sessionId,
      p_expected_state_version: input.expectedVersion,
      p_snapshot: input.snapshot,
      p_updated_by: input.actorUserId,
    })
    .maybeSingle();
  if (error || !data) return null;
  return mapRow(data as RuntimeSnapshotRow);
}

/**
 * Shadow-mode dual write. Reads the completed Liveblocks mutation, then stores
 * the same control-plane state with optimistic versioning. It must never make
 * a visible Liveblocks tool command fail during migration.
 */
export async function syncClassroomRuntimeSnapshotFromLiveblocks(input: {
  sessionId: string;
  roomId: string;
  actorUserId: string;
}): Promise<ClassroomRuntimeSnapshot | null> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const current = await getClassroomRuntimeSnapshot(input.sessionId);
    if (!current) return null;
    try {
      const liveblocks = getLiveblocksServerClient();
      const storage = await liveblocks.getStorageDocument(input.roomId, "json");
      const runtime = readRuntimeFromStorage(storage);
      if (!runtime) return null;
      const next = mergeLiveblocksRuntimeIntoSnapshot({
        current,
        runtime,
        actorUserId: input.actorUserId,
      });
      const saved = await advanceClassroomRuntimeSnapshot({
        expectedVersion: current.stateVersion,
        snapshot: next,
        actorUserId: input.actorUserId,
      });
      if (saved) {
        // Only a version signal is broadcast. Shadow clients make one
        // authenticated recovery request, which avoids duplicating the whole
        // Liveblocks state over a second transport.
        void broadcastClassroomRuntimeUpdate(snapshotEvent(saved, ["runtime"]));
        return saved;
      }
    } catch {
      return null;
    }
  }
  return null;
}
