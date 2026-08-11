import "server-only";

import type {
  ClassroomRuntimePatch,
  ClassroomRuntimeSnapshot,
} from "@/lib/classroom-realtime/types";
import {
  clearLastRoll,
  configureRandomiser,
  createSeededDiceRandom,
  createEmptyRandomiser,
  normalizeRandomiserState,
  rollDice,
} from "@/lib/virtual-classroom/tools/dice";
import {
  createEmptyGroupSet,
  generateRandomGroups,
  moveStudentBetweenGroups,
  normalizeGroupSetState,
  renameGroup,
  restorePreviousGroups,
  saveCurrentAsPrevious,
  setGroupLeader,
  shuffleUnlockedGroups,
  toggleGroupLock,
} from "@/lib/virtual-classroom/tools/groups";
import {
  createEmptyPickerState,
  normalizeStudentPickerState,
  pickStudents,
  resetPickerCycle,
  setPickerExcluded,
  syncPickerRoster,
} from "@/lib/virtual-classroom/tools/picker";
import {
  awardPoints,
  createEmptySessionPoints,
  normalizeSessionPointsState,
  resetSessionPoints,
  undoLastAward,
} from "@/lib/virtual-classroom/tools/points";
import {
  clearAllStatuses,
  createEmptyClassroomStatus,
  normalizeClassroomStatusState,
  setInteractionFrozen,
  setStudentStatus,
} from "@/lib/virtual-classroom/tools/status";
import {
  addGlobalTime,
  createIdleGlobalTimer,
  maybeExpireCountdown,
  normalizeGlobalTimerState,
  pauseGlobalTimer,
  resetGlobalTimer,
  resolveTimerActionTime,
  resumeGlobalTimer,
  setGlobalTimerMode,
  startGlobalTimer,
} from "@/lib/virtual-classroom/tools/timer";
import { createServiceRoleSupabase } from "@/lib/supabase/service-role-client";
import { getLiveblocksServerClient } from "@/lib/live-game/server/liveblocks-client";
import { snapshotEvent } from "@/lib/classroom-realtime/events";
import { broadcastClassroomRuntimeUpdate } from "@/lib/classroom-realtime/server/broadcast";
import { createLatestOnlyWorkQueue } from "@/lib/classroom-realtime/server/latest-only-queue";
import { normalizeVirtualClassroomPresentation } from "@/lib/virtual-classroom/presentation";
import type { VcToolCommand } from "@/lib/virtual-classroom/server/tools";

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
    // Snapshots created before learnActivity entered the recovery contract
    // remain readable; the next teacher control write fills it in.
    learnActivity: normaliseLearnActivity(row.snapshot_json.learnActivity),
    learnPresentation: normalizeVirtualClassroomPresentation(
      row.snapshot_json.learnPresentation,
    ),
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
    learnActivity: null,
    learnPresentation: null,
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

function normaliseLearnActivity(value: unknown): ClassroomRuntimeSnapshot["learnActivity"] {
  const row = objectOrNull(value);
  if (!row) return null;
  const activityId = typeof row.activityId === "string" ? row.activityId.trim() : "";
  const playPath = typeof row.playPath === "string" ? row.playPath.trim() : "";
  if (!activityId || !playPath) return null;
  return {
    activityId,
    playPath,
    format: typeof row.format === "string" && row.format.trim() ? row.format.trim() : "learning_track",
    title: typeof row.title === "string" && row.title.trim() ? row.title.trim() : "Activity",
  };
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
    learnStage:
      input.runtime.learnStage === "activity" || input.runtime.learnStage === "presentation"
        ? input.runtime.learnStage
        : "whiteboard",
    learnActivity: normaliseLearnActivity(input.runtime.learnActivity),
    learnPresentation: normalizeVirtualClassroomPresentation(
      input.runtime.learnPresentation,
    ),
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
  "learnActivity",
  "learnPresentation",
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

const SUPABASE_AUTHORITY_COMMANDS = new Set<VcToolCommand["type"]>([
  "SET_UI_MODE",
  "SET_LEARN_STAGE",
  "SET_LEARN_ACTIVITY",
  "SET_LEARN_PRESENTATION",
  "SET_LEARN_STUDENT_PENS",
  "SET_ANNOUNCEMENT",
]);

const SUPABASE_TOOL_AUTHORITY_COMMANDS = new Set<VcToolCommand["type"]>([
  "SYNC_ROSTER",
  "SET_PICKER_MODE",
  "PICK",
  "RESET_PICKER_CYCLE",
  "SET_PICKER_EXCLUDED",
  "GENERATE_GROUPS",
  "SHUFFLE_GROUPS",
  "SAVE_GROUPS",
  "RESTORE_GROUPS",
  "MOVE_STUDENT",
  "RENAME_GROUP",
  "SET_GROUP_LEADER",
  "TOGGLE_GROUP_LOCK",
  "SET_TIMER_MODE",
  "START_TIMER",
  "PAUSE_TIMER",
  "RESUME_TIMER",
  "ADD_TIMER_MS",
  "RESET_TIMER",
  "SET_TIMER_VISIBLE",
  "CONFIGURE_DICE",
  "ROLL_DICE",
  "CLEAR_DICE",
  "AWARD_POINTS",
  "UNDO_AWARD",
  "RESET_POINTS",
  "SET_LEADERBOARD_VISIBLE",
  "SET_OWN_STATUS",
  "CLEAR_STATUSES",
  "SET_FREEZE",
]);

const ROSTER_REQUIRED_AUTHORITY_COMMANDS = new Set<VcToolCommand["type"]>([
  "SYNC_ROSTER",
  "PICK",
  "GENERATE_GROUPS",
  "SHUFFLE_GROUPS",
]);

export function classroomRuntimeCommandRequiresRoster(command: VcToolCommand): boolean {
  return ROSTER_REQUIRED_AUTHORITY_COMMANDS.has(command.type);
}

export function classroomRuntimeCommandAuthorityKind(
  command: VcToolCommand,
): "control" | "tool" | null {
  if (SUPABASE_AUTHORITY_COMMANDS.has(command.type)) return "control";
  if (SUPABASE_TOOL_AUTHORITY_COMMANDS.has(command.type)) return "tool";
  return null;
}

export function classroomRuntimeCommandSupportsSupabaseAuthority(
  command: VcToolCommand,
): boolean {
  return classroomRuntimeCommandAuthorityKind(command) !== null;
}

/** Pure command projection shared by the authority writer and contract tests. */
export function projectClassroomRuntimeCommand(input: {
  current: ClassroomRuntimeSnapshot;
  command: VcToolCommand;
  actorUserId: string;
  activeStudentIds?: string[];
  now?: Date;
}): { snapshot: ClassroomRuntimeSnapshot; patch: ClassroomRuntimePatch; changed: string[] } | null {
  if (!classroomRuntimeCommandSupportsSupabaseAuthority(input.command)) return null;

  let patch: ClassroomRuntimePatch;
  const nowMs = (input.now ?? new Date()).getTime();
  const actionNowMs = resolveTimerActionTime(
    "requestedAt" in input.command ? input.command.requestedAt : undefined,
    nowMs,
  );
  const picker = normalizeStudentPickerState(input.current.tools.picker) ?? createEmptyPickerState([]);
  const groups = normalizeGroupSetState(input.current.tools.groupSet) ?? createEmptyGroupSet();
  const timer = normalizeGlobalTimerState(input.current.tools.timer) ?? createIdleGlobalTimer();
  const randomiser = normalizeRandomiserState(input.current.tools.randomiser) ?? createEmptyRandomiser();
  const points = normalizeSessionPointsState(input.current.tools.points) ?? createEmptySessionPoints();
  const status = normalizeClassroomStatusState(input.current.tools.classroomStatus) ?? createEmptyClassroomStatus();
  const rosterIds = (includeTeacher: boolean) => [
    ...(includeTeacher ? [input.actorUserId] : []),
    ...(input.activeStudentIds ?? []),
  ];
  switch (input.command.type) {
    case "SET_UI_MODE":
      patch = { uiMode: input.command.mode === "meeting" ? "meeting" : "learn" };
      break;
    case "SET_LEARN_STAGE":
      patch = {
        learnStage:
          input.command.stage === "activity" || input.command.stage === "presentation"
            ? input.command.stage
            : "whiteboard",
      };
      break;
    case "SET_LEARN_ACTIVITY": {
      if (!input.command.activity) {
        patch = { learnActivity: null };
        break;
      }
      const activityId = input.command.activity.activityId?.trim() ?? "";
      const playPath = input.command.activity.playPath?.trim() ?? "";
      if (!activityId || !playPath) throw new Error("Activity id and play path are required.");
      patch = {
        learnActivity: {
          activityId,
          format: (input.command.activity.format?.trim() || "learning_track").slice(0, 64),
          title: (input.command.activity.title?.trim() || "Activity").slice(0, 160),
          playPath: playPath.slice(0, 500),
        },
        learnStage: "activity",
      };
      break;
    }
    case "SET_LEARN_PRESENTATION": {
      if (!input.command.presentation) {
        patch = { learnPresentation: null };
        break;
      }
      const presentation = normalizeVirtualClassroomPresentation(input.command.presentation);
      if (!presentation) throw new Error("Add a valid image or PDF URL before presenting.");
      patch = { learnPresentation: presentation, learnStage: "presentation" };
      break;
    }
    case "SET_LEARN_STUDENT_PENS":
      patch = { learnStudentPensEnabled: input.command.enabled !== false };
      break;
    case "SET_ANNOUNCEMENT":
      patch = { announcement: input.command.message?.trim().slice(0, 280) || null };
      break;
    case "SYNC_ROSTER": {
      const includeTeacher = input.command.includeTeacher ?? picker.includeTeacher;
      patch = { tools: { picker: { ...syncPickerRoster(picker, rosterIds(includeTeacher)), includeTeacher } } };
      break;
    }
    case "SET_PICKER_MODE":
      patch = { tools: { picker: { ...picker, mode: input.command.mode } } };
      break;
    case "PICK": {
      const synced = syncPickerRoster(picker, rosterIds(picker.includeTeacher));
      patch = { tools: { picker: pickStudents(synced, { count: input.command.count ?? (synced.mode === "two" ? 2 : 1) }) } };
      break;
    }
    case "RESET_PICKER_CYCLE":
      patch = { tools: { picker: resetPickerCycle(picker) } };
      break;
    case "SET_PICKER_EXCLUDED":
      patch = { tools: { picker: setPickerExcluded(picker, input.command.excludedStudentIds) } };
      break;
    case "GENERATE_GROUPS": {
      const previous = groups.groups.length ? groups.groups : groups.previousGroups;
      patch = { tools: { groupSet: {
        ...generateRandomGroups({ studentIds: rosterIds(false), sizeMode: input.command.sizeMode, targetGroupCount: input.command.targetGroupCount ?? null }),
        previousGroups: previous,
      } } };
      break;
    }
    case "SHUFFLE_GROUPS":
      patch = { tools: { groupSet: shuffleUnlockedGroups(groups, rosterIds(false)) } };
      break;
    case "SAVE_GROUPS":
      patch = { tools: { groupSet: saveCurrentAsPrevious(groups) } };
      break;
    case "RESTORE_GROUPS":
      patch = { tools: { groupSet: restorePreviousGroups(groups) } };
      break;
    case "MOVE_STUDENT":
      patch = { tools: { groupSet: moveStudentBetweenGroups(groups, input.command.studentId, input.command.toGroupId) } };
      break;
    case "RENAME_GROUP":
      patch = { tools: { groupSet: renameGroup(groups, input.command.groupId, input.command.name) } };
      break;
    case "SET_GROUP_LEADER":
      patch = { tools: { groupSet: setGroupLeader(groups, input.command.groupId, input.command.leaderId) } };
      break;
    case "TOGGLE_GROUP_LOCK":
      patch = { tools: { groupSet: toggleGroupLock(groups, input.command.groupId) } };
      break;
    case "SET_TIMER_MODE":
      patch = { tools: { timer: setGlobalTimerMode(timer, input.command.mode) } };
      break;
    case "START_TIMER":
      patch = { tools: { timer: maybeExpireCountdown(startGlobalTimer(timer, actionNowMs, input.command.durationMs), nowMs) } };
      break;
    case "PAUSE_TIMER":
      patch = { tools: { timer: pauseGlobalTimer(timer, actionNowMs) } };
      break;
    case "RESUME_TIMER":
      patch = { tools: { timer: maybeExpireCountdown(resumeGlobalTimer(timer, actionNowMs), nowMs) } };
      break;
    case "ADD_TIMER_MS":
      patch = { tools: { timer: maybeExpireCountdown(addGlobalTime(timer, input.command.milliseconds), nowMs) } };
      break;
    case "RESET_TIMER":
      patch = { tools: { timer: resetGlobalTimer(timer, input.command.durationMs) } };
      break;
    case "SET_TIMER_VISIBLE":
      patch = { tools: { timer: { ...timer, visibleToStudents: input.command.visibleToStudents } } };
      break;
    case "CONFIGURE_DICE":
      patch = { tools: { randomiser: configureRandomiser(randomiser, input.command) } };
      break;
    case "ROLL_DICE":
      patch = { tools: { randomiser: rollDice(randomiser, {
        nowMs,
        ...(typeof input.command.seed === "number"
          ? { random: createSeededDiceRandom(input.command.seed) }
          : {}),
      }) } };
      break;
    case "CLEAR_DICE":
      patch = { tools: { randomiser: clearLastRoll(randomiser) } };
      break;
    case "AWARD_POINTS":
      patch = { tools: { points: awardPoints(points, { ...input.command, nowMs }) } };
      break;
    case "UNDO_AWARD":
      patch = { tools: { points: undoLastAward(points) } };
      break;
    case "RESET_POINTS":
      patch = { tools: { points: resetSessionPoints(points) } };
      break;
    case "SET_LEADERBOARD_VISIBLE":
      patch = { tools: { points: { ...points, showLeaderboard: input.command.showLeaderboard } } };
      break;
    case "SET_OWN_STATUS":
      if (input.command.studentId !== input.actorUserId) throw new Error("You can only set your own status.");
      patch = { tools: { classroomStatus: setStudentStatus(status, input.command.studentId, input.command.status) } };
      break;
    case "CLEAR_STATUSES":
      patch = { tools: { classroomStatus: clearAllStatuses(status) } };
      break;
    case "SET_FREEZE":
      patch = { tools: { classroomStatus: setInteractionFrozen(status, input.command.frozen) } };
      break;
    default:
      return null;
  }

  const nextState = {
    ...input.current,
    ...patch,
    tools: patch.tools ? { ...input.current.tools, ...patch.tools } : input.current.tools,
  };
  const changed = Object.keys(patch).filter(
    (key) =>
      !valuesMatch(
        input.current[key as keyof ClassroomRuntimeSnapshot],
        nextState[key as keyof ClassroomRuntimeSnapshot],
      ),
  );
  const now = input.now ?? new Date(nowMs);
  return {
    snapshot: {
      ...nextState,
      updatedAt: now.toISOString(),
      updatedBy: input.actorUserId,
    },
    patch,
    changed,
  };
}

/** Commit a supported classroom control to the durable Supabase authority. */
export async function applyClassroomRuntimeCommand(input: {
  sessionId: string;
  command: VcToolCommand;
  actorUserId: string;
  activeStudentIds?: string[];
}): Promise<
  | { handled: false }
  | {
      handled: true;
      ok: true;
      snapshot: ClassroomRuntimeSnapshot;
      patch: ClassroomRuntimePatch;
      changed: string[];
    }
  | { handled: true; ok: false; error: string }
> {
  if (!classroomRuntimeCommandSupportsSupabaseAuthority(input.command)) {
    return { handled: false };
  }
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const current = await getClassroomRuntimeSnapshot(input.sessionId);
    if (!current) {
      return { handled: true, ok: false, error: "Classroom runtime snapshot is unavailable." };
    }
    let projected: NonNullable<ReturnType<typeof projectClassroomRuntimeCommand>>;
    try {
      projected = projectClassroomRuntimeCommand({
        current,
        command: input.command,
        actorUserId: input.actorUserId,
        activeStudentIds: input.activeStudentIds,
      })!;
    } catch (error) {
      return {
        handled: true,
        ok: false,
        error: error instanceof Error ? error.message : "Classroom command is invalid.",
      };
    }
    if (projected.changed.length === 0) {
      return {
        handled: true,
        ok: true,
        snapshot: current,
        patch: projected.patch,
        changed: [],
      };
    }
    const saved = await advanceClassroomRuntimeSnapshot({
      expectedVersion: current.stateVersion,
      snapshot: projected.snapshot,
      actorUserId: input.actorUserId,
    });
    if (!saved) continue;
    return {
      handled: true,
      ok: true,
      snapshot: saved,
      patch: projected.patch,
      changed: projected.changed,
    };
  }
  return { handled: true, ok: false, error: "Classroom state changed; please try again." };
}

/** Persists the terminal lifecycle state without depending on a legacy room read. */
export async function endClassroomRuntimeSnapshot(input: {
  sessionId: string;
  actorUserId: string;
}): Promise<ClassroomRuntimeSnapshot | null> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const current = await getClassroomRuntimeSnapshot(input.sessionId);
    if (!current) return null;
    if (current.status === "ended") return current;
    const saved = await advanceClassroomRuntimeSnapshot({
      expectedVersion: current.stateVersion,
      actorUserId: input.actorUserId,
      snapshot: {
        ...current,
        status: "ended",
        activeActivity: {
          kind: null,
          joinCode: null,
          label: null,
          roundId: null,
          roomId: null,
        },
        updatedAt: new Date().toISOString(),
        updatedBy: input.actorUserId,
      },
    });
    if (saved) {
      void broadcastClassroomRuntimeUpdate(snapshotEvent(saved, ["status", "activeActivity"]));
      return saved;
    }
  }
  return null;
}

/** Persists only the reference to a nested collaborative activity room. */
export async function setClassroomRuntimeActiveActivity(input: {
  sessionId: string;
  actorUserId: string;
  activeActivity: ClassroomRuntimeSnapshot["activeActivity"];
}): Promise<
  | { ok: true; snapshot: ClassroomRuntimeSnapshot; patch: ClassroomRuntimePatch; changed: string[] }
  | { ok: false; error: string }
> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const current = await getClassroomRuntimeSnapshot(input.sessionId);
    if (!current) return { ok: false, error: "Classroom runtime snapshot is unavailable." };
    if (valuesMatch(current.activeActivity, input.activeActivity)) {
      return { ok: true, snapshot: current, patch: { activeActivity: input.activeActivity }, changed: [] };
    }
    const saved = await advanceClassroomRuntimeSnapshot({
      expectedVersion: current.stateVersion,
      actorUserId: input.actorUserId,
      snapshot: {
        ...current,
        activeActivity: input.activeActivity,
        updatedAt: new Date().toISOString(),
        updatedBy: input.actorUserId,
      },
    });
    if (saved) {
      return {
        ok: true,
        snapshot: saved,
        patch: { activeActivity: input.activeActivity },
        changed: ["activeActivity"],
      };
    }
  }
  return { ok: false, error: "Classroom state changed; please try again." };
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

const classroomRuntimeSnapshotQueue = createLatestOnlyWorkQueue<
  string,
  Parameters<typeof syncClassroomRuntimeSnapshotFromLiveblocks>[0]
>({
  delayMs: 120,
  work: async (input) => {
    await syncClassroomRuntimeSnapshotFromLiveblocks(input);
  },
});

/**
 * Process-local write coalescing for rapid teacher actions. The durable
 * compare-and-swap remains the concurrency guard across server instances.
 */
export function queueClassroomRuntimeSnapshotSync(
  input: Parameters<typeof syncClassroomRuntimeSnapshotFromLiveblocks>[0],
): Promise<void> {
  return classroomRuntimeSnapshotQueue.enqueue(input.sessionId, input);
}
