import "server-only";

import type { ClassroomRuntimeSnapshot } from "@/lib/classroom-realtime/types";
import { createEmptyRandomiser } from "@/lib/virtual-classroom/tools/dice";
import { createEmptyGroupSet } from "@/lib/virtual-classroom/tools/groups";
import { createEmptyPickerState } from "@/lib/virtual-classroom/tools/picker";
import { createEmptySessionPoints } from "@/lib/virtual-classroom/tools/points";
import { createEmptyClassroomStatus } from "@/lib/virtual-classroom/tools/status";
import { createIdleGlobalTimer } from "@/lib/virtual-classroom/tools/timer";
import { createServiceRoleSupabase } from "@/lib/supabase/service-role-client";

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

