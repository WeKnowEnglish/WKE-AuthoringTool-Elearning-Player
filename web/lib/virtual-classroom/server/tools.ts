import "server-only";

import { applyDocumentTeacherCommand } from "@/lib/document-activity/server/commands";
import { getDocumentRoundById } from "@/lib/document-activity/server/persistence";
import { getLiveblocksServerClient } from "@/lib/live-game/server/liveblocks-client";
import { toWordCardsRoomId } from "@/lib/word-cards/domain";
import { applyWordCardsTeacherCommand } from "@/lib/word-cards/server/commands";
import { getWordCardRoundByJoinCode } from "@/lib/word-cards/server/persistence";
import {
  clearLastRoll,
  configureRandomiser,
  createEmptyRandomiser,
  rollDice,
  type DicePreset,
  type RandomiserState,
} from "@/lib/virtual-classroom/tools/dice";
import {
  createEmptyGroupSet,
  generateRandomGroups,
  moveStudentBetweenGroups,
  renameGroup,
  restorePreviousGroups,
  saveCurrentAsPrevious,
  setGroupLeader,
  shuffleUnlockedGroups,
  toWhiteboardAssignPayload,
  toggleGroupLock,
  type GroupSetState,
  type GroupSizeMode,
} from "@/lib/virtual-classroom/tools/groups";
import {
  createEmptyPickerState,
  pickStudents,
  resetPickerCycle,
  setPickerExcluded,
  syncPickerRoster,
  type PickerMode,
  type StudentPickerState,
} from "@/lib/virtual-classroom/tools/picker";
import {
  awardPoints,
  createEmptySessionPoints,
  resetSessionPoints,
  undoLastAward,
  type AwardLabel,
  type SessionPointsState,
} from "@/lib/virtual-classroom/tools/points";
import {
  clearAllStatuses,
  createEmptyClassroomStatus,
  setInteractionFrozen,
  setStudentStatus,
  type ClassroomStatusKind,
  type ClassroomStatusState,
} from "@/lib/virtual-classroom/tools/status";
import {
  addGlobalTime,
  createIdleGlobalTimer,
  maybeExpireCountdown,
  pauseGlobalTimer,
  resetGlobalTimer,
  resumeGlobalTimer,
  setGlobalTimerMode,
  startGlobalTimer,
  type GlobalTimerMode,
  type GlobalTimerState,
} from "@/lib/virtual-classroom/tools/timer";
import { applyTeacherCommand } from "@/lib/whiteboard/server/commands";
import { toWhiteboardRoomId } from "@/lib/whiteboard/liveblocks/room-id";
import { syncClassroomRuntimeSnapshotFromLiveblocks } from "@/lib/virtual-classroom/server/runtime-snapshot";

type RuntimeNode = {
  get: (key: string) => unknown;
  set: (key: string, value: unknown) => void;
};

function runtimeOf(root: unknown): RuntimeNode {
  return (root as { get: (k: string) => RuntimeNode }).get("runtime");
}

function readPicker(runtime: RuntimeNode): StudentPickerState {
  const raw = runtime.get("picker") as StudentPickerState | null | undefined;
  return raw ?? createEmptyPickerState([]);
}

function readGroups(runtime: RuntimeNode): GroupSetState {
  const raw = runtime.get("groupSet") as GroupSetState | null | undefined;
  return raw ?? createEmptyGroupSet();
}

function readTimer(runtime: RuntimeNode): GlobalTimerState {
  const raw = runtime.get("timer") as GlobalTimerState | null | undefined;
  return raw ?? createIdleGlobalTimer();
}

function readRandomiser(runtime: RuntimeNode): RandomiserState {
  const raw = runtime.get("randomiser") as RandomiserState | null | undefined;
  return raw ?? createEmptyRandomiser();
}

function readPoints(runtime: RuntimeNode): SessionPointsState {
  const raw = runtime.get("points") as SessionPointsState | null | undefined;
  return raw ?? createEmptySessionPoints();
}

function readStatus(runtime: RuntimeNode): ClassroomStatusState {
  const raw = runtime.get("classroomStatus") as ClassroomStatusState | null | undefined;
  return raw ?? createEmptyClassroomStatus();
}

type MemberNode = { get: (k: string) => unknown };
type MembersMap = { entries?: () => IterableIterator<[string, MemberNode]> };

function memberStudentIds(root: unknown, includeTeacher: boolean): string[] {
  const members = (root as { get: (k: string) => MembersMap }).get("members");
  if (!members?.entries) return [];
  const ids: string[] = [];
  for (const [id, node] of members.entries()) {
    const role = node.get("role") as string;
    if (role === "host" && !includeTeacher) continue;
    ids.push(id);
  }
  return ids;
}

export type VcToolCommand =
  | { type: "SYNC_ROSTER"; includeTeacher?: boolean }
  | { type: "SET_PICKER_MODE"; mode: PickerMode }
  | { type: "PICK"; count?: number }
  | { type: "RESET_PICKER_CYCLE" }
  | { type: "SET_PICKER_EXCLUDED"; excludedStudentIds: string[] }
  | {
      type: "GENERATE_GROUPS";
      sizeMode: GroupSizeMode;
      targetGroupCount?: number | null;
    }
  | { type: "SHUFFLE_GROUPS" }
  | { type: "SAVE_GROUPS" }
  | { type: "RESTORE_GROUPS" }
  | { type: "MOVE_STUDENT"; studentId: string; toGroupId: string }
  | { type: "RENAME_GROUP"; groupId: string; name: string }
  | { type: "SET_GROUP_LEADER"; groupId: string; leaderId: string }
  | { type: "TOGGLE_GROUP_LOCK"; groupId: string }
  | { type: "SEND_GROUPS_TO_WHITEBOARD" }
  | { type: "SEND_GROUPS_TO_DOCUMENT" }
  | { type: "SEND_GROUPS_TO_WORD_CARDS" }
  | { type: "SET_TIMER_MODE"; mode: GlobalTimerMode }
  | { type: "START_TIMER"; durationMs?: number }
  | { type: "PAUSE_TIMER" }
  | { type: "RESUME_TIMER" }
  | { type: "ADD_TIMER_MS"; milliseconds: number }
  | { type: "RESET_TIMER"; durationMs?: number }
  | { type: "SET_TIMER_VISIBLE"; visibleToStudents: boolean }
  | {
      type: "CONFIGURE_DICE";
      preset?: DicePreset;
      sides?: number;
      diceCount?: number;
      labels?: string[];
      visibility?: "class" | "teacher";
      locked?: boolean;
    }
  | { type: "ROLL_DICE" }
  | { type: "CLEAR_DICE" }
  | {
      type: "AWARD_POINTS";
      studentId: string;
      delta: number;
      label?: AwardLabel;
    }
  | { type: "UNDO_AWARD" }
  | { type: "RESET_POINTS" }
  | { type: "SET_LEADERBOARD_VISIBLE"; showLeaderboard: boolean }
  | { type: "SET_OWN_STATUS"; status: ClassroomStatusKind; studentId: string }
  | { type: "CLEAR_STATUSES" }
  | { type: "SET_FREEZE"; frozen: boolean }
  | { type: "SET_ANNOUNCEMENT"; message: string | null }
  | { type: "SET_UI_MODE"; mode: "meeting" | "learn" }
  | { type: "SET_LEARN_STAGE"; stage: "whiteboard" | "activity" }
  | {
      type: "SET_LEARN_ACTIVITY";
      activity: {
        activityId: string;
        format: string;
        title: string;
        playPath: string;
      } | null;
    }
  | { type: "SET_LEARN_STUDENT_PENS"; enabled: boolean };

/** Commands students may issue for themselves. */
export const VC_MEMBER_TOOL_TYPES = new Set<VcToolCommand["type"]>(["SET_OWN_STATUS"]);

export async function applyVcToolCommand(input: {
  roomId: string;
  /** Enables best-effort Supabase dual-write after a teacher command. */
  sessionId?: string;
  command: VcToolCommand;
  actorUserId?: string;
}): Promise<{ ok: true; detail?: string } | { ok: false; error: string }> {
  const liveblocks = getLiveblocksServerClient();

  try {
    let whiteboardJoinCode: string | null = null;
    let groupsForWhiteboard: ReturnType<typeof toWhiteboardAssignPayload> = [];
    let documentRoundId: string | null = null;
    let groupsForDocument: ReturnType<typeof toWhiteboardAssignPayload> = [];
    let wordCardsJoinCode: string | null = null;
    let groupsForWordCards: ReturnType<typeof toWhiteboardAssignPayload> = [];

    await liveblocks.mutateStorage(input.roomId, ({ root }) => {
      const runtime = runtimeOf(root);
      const picker = readPicker(runtime);
      const groupSet = readGroups(runtime);
      const timer = readTimer(runtime);
      const randomiser = readRandomiser(runtime);
      const points = readPoints(runtime);
      const classroomStatus = readStatus(runtime);
      const nowMs = Date.now();

      switch (input.command.type) {
        case "SYNC_ROSTER": {
          const includeTeacher = input.command.includeTeacher ?? picker.includeTeacher;
          const ids = memberStudentIds(root, includeTeacher);
          runtime.set("picker", {
            ...syncPickerRoster(picker, ids),
            includeTeacher,
          });
          break;
        }
        case "SET_PICKER_MODE": {
          runtime.set("picker", { ...picker, mode: input.command.mode });
          break;
        }
        case "PICK": {
          const includeTeacher = picker.includeTeacher;
          const ids = memberStudentIds(root, includeTeacher);
          const synced = syncPickerRoster(picker, ids);
          runtime.set(
            "picker",
            pickStudents(synced, {
              count: input.command.count ?? (synced.mode === "two" ? 2 : 1),
            }),
          );
          break;
        }
        case "RESET_PICKER_CYCLE": {
          runtime.set("picker", resetPickerCycle(picker));
          break;
        }
        case "SET_PICKER_EXCLUDED": {
          runtime.set(
            "picker",
            setPickerExcluded(picker, input.command.excludedStudentIds),
          );
          break;
        }
        case "GENERATE_GROUPS": {
          const ids = memberStudentIds(root, false);
          const previous = groupSet.groups.length ? groupSet.groups : groupSet.previousGroups;
          const next = generateRandomGroups({
            studentIds: ids,
            sizeMode: input.command.sizeMode,
            targetGroupCount: input.command.targetGroupCount ?? null,
          });
          runtime.set("groupSet", {
            ...next,
            previousGroups: previous,
          });
          break;
        }
        case "SHUFFLE_GROUPS": {
          const ids = memberStudentIds(root, false);
          runtime.set("groupSet", shuffleUnlockedGroups(groupSet, ids));
          break;
        }
        case "SAVE_GROUPS": {
          runtime.set("groupSet", saveCurrentAsPrevious(groupSet));
          break;
        }
        case "RESTORE_GROUPS": {
          runtime.set("groupSet", restorePreviousGroups(groupSet));
          break;
        }
        case "MOVE_STUDENT": {
          runtime.set(
            "groupSet",
            moveStudentBetweenGroups(
              groupSet,
              input.command.studentId,
              input.command.toGroupId,
            ),
          );
          break;
        }
        case "RENAME_GROUP": {
          runtime.set(
            "groupSet",
            renameGroup(groupSet, input.command.groupId, input.command.name),
          );
          break;
        }
        case "SET_GROUP_LEADER": {
          runtime.set(
            "groupSet",
            setGroupLeader(groupSet, input.command.groupId, input.command.leaderId),
          );
          break;
        }
        case "TOGGLE_GROUP_LOCK": {
          runtime.set("groupSet", toggleGroupLock(groupSet, input.command.groupId));
          break;
        }
        case "SEND_GROUPS_TO_WHITEBOARD": {
          const activity = runtime.get("activeActivity") as {
            kind: string | null;
            joinCode: string | null;
          } | null;
          if (activity?.kind !== "whiteboard" || !activity.joinCode) {
            throw new Error("Start a whiteboard activity first.");
          }
          if (!groupSet.groups.length) {
            throw new Error("Generate groups before sending.");
          }
          whiteboardJoinCode = activity.joinCode;
          groupsForWhiteboard = toWhiteboardAssignPayload(groupSet.groups);
          break;
        }
        case "SEND_GROUPS_TO_DOCUMENT": {
          const activity = runtime.get("activeActivity") as {
            kind: string | null;
            joinCode: string | null;
            roundId?: string | null;
          } | null;
          if (activity?.kind !== "document") {
            throw new Error("Start a group document activity first.");
          }
          const roundId = activity.roundId ?? activity.joinCode;
          if (!roundId) {
            throw new Error("Document round is missing.");
          }
          if (!groupSet.groups.length) {
            throw new Error("Generate groups before sending.");
          }
          documentRoundId = roundId;
          groupsForDocument = toWhiteboardAssignPayload(groupSet.groups);
          break;
        }
        case "SEND_GROUPS_TO_WORD_CARDS": {
          const activity = runtime.get("activeActivity") as {
            kind: string | null;
            joinCode: string | null;
          } | null;
          if (activity?.kind !== "word_cards" || !activity.joinCode) {
            throw new Error("Start a group word cards activity first.");
          }
          if (!groupSet.groups.length) {
            throw new Error("Generate groups before sending.");
          }
          wordCardsJoinCode = activity.joinCode;
          groupsForWordCards = toWhiteboardAssignPayload(groupSet.groups);
          break;
        }
        case "SET_TIMER_MODE": {
          runtime.set("timer", setGlobalTimerMode(timer, input.command.mode));
          break;
        }
        case "START_TIMER": {
          runtime.set(
            "timer",
            startGlobalTimer(timer, nowMs, input.command.durationMs),
          );
          break;
        }
        case "PAUSE_TIMER": {
          runtime.set("timer", pauseGlobalTimer(timer, nowMs));
          break;
        }
        case "RESUME_TIMER": {
          runtime.set("timer", resumeGlobalTimer(timer, nowMs));
          break;
        }
        case "ADD_TIMER_MS": {
          runtime.set("timer", addGlobalTime(timer, input.command.milliseconds));
          break;
        }
        case "RESET_TIMER": {
          runtime.set("timer", resetGlobalTimer(timer, input.command.durationMs));
          break;
        }
        case "SET_TIMER_VISIBLE": {
          runtime.set("timer", {
            ...timer,
            visibleToStudents: input.command.visibleToStudents,
          });
          break;
        }
        case "CONFIGURE_DICE": {
          runtime.set(
            "randomiser",
            configureRandomiser(randomiser, {
              preset: input.command.preset,
              sides: input.command.sides,
              diceCount: input.command.diceCount,
              labels: input.command.labels,
              visibility: input.command.visibility,
              locked: input.command.locked,
            }),
          );
          break;
        }
        case "ROLL_DICE": {
          runtime.set("randomiser", rollDice(randomiser, { nowMs }));
          break;
        }
        case "CLEAR_DICE": {
          runtime.set("randomiser", clearLastRoll(randomiser));
          break;
        }
        case "AWARD_POINTS": {
          runtime.set(
            "points",
            awardPoints(points, {
              studentId: input.command.studentId,
              delta: input.command.delta,
              label: input.command.label,
              nowMs,
            }),
          );
          break;
        }
        case "UNDO_AWARD": {
          runtime.set("points", undoLastAward(points));
          break;
        }
        case "RESET_POINTS": {
          runtime.set("points", resetSessionPoints(points));
          break;
        }
        case "SET_LEADERBOARD_VISIBLE": {
          runtime.set("points", {
            ...points,
            showLeaderboard: input.command.showLeaderboard,
          });
          break;
        }
        case "SET_OWN_STATUS": {
          if (
            input.actorUserId &&
            input.command.studentId !== input.actorUserId
          ) {
            throw new Error("You can only set your own status.");
          }
          runtime.set(
            "classroomStatus",
            setStudentStatus(
              classroomStatus,
              input.command.studentId,
              input.command.status,
            ),
          );
          break;
        }
        case "CLEAR_STATUSES": {
          runtime.set("classroomStatus", clearAllStatuses(classroomStatus));
          break;
        }
        case "SET_FREEZE": {
          runtime.set(
            "classroomStatus",
            setInteractionFrozen(classroomStatus, input.command.frozen),
          );
          break;
        }
        case "SET_ANNOUNCEMENT": {
          const message = input.command.message?.trim().slice(0, 280) || null;
          runtime.set("announcement", message);
          break;
        }
        case "SET_UI_MODE": {
          const mode = input.command.mode === "meeting" ? "meeting" : "learn";
          runtime.set("uiMode", mode);
          break;
        }
        case "SET_LEARN_STAGE": {
          const stage =
            input.command.stage === "activity" ? "activity" : "whiteboard";
          runtime.set("learnStage", stage);
          break;
        }
        case "SET_LEARN_ACTIVITY": {
          const next = input.command.activity;
          if (!next) {
            runtime.set("learnActivity", null);
            break;
          }
          const activityId = next.activityId?.trim() ?? "";
          const playPath = next.playPath?.trim() ?? "";
          if (!activityId || !playPath) {
            throw new Error("Activity id and play path are required.");
          }
          runtime.set("learnActivity", {
            activityId,
            format: (next.format?.trim() || "learning_track").slice(0, 64),
            title: (next.title?.trim() || "Activity").slice(0, 160),
            playPath: playPath.slice(0, 500),
          });
          runtime.set("learnStage", "activity");
          break;
        }
        case "SET_LEARN_STUDENT_PENS": {
          runtime.set("learnStudentPensEnabled", input.command.enabled !== false);
          break;
        }
        default:
          throw new Error("Unknown tool command.");
      }

      // Keep countdown expiry in sync when host touches timer.
      if (
        input.command.type === "START_TIMER" ||
        input.command.type === "RESUME_TIMER" ||
        input.command.type === "ADD_TIMER_MS"
      ) {
        const t = readTimer(runtime);
        runtime.set("timer", maybeExpireCountdown(t, nowMs));
      }
    });

    if (input.command.type === "SEND_GROUPS_TO_WHITEBOARD" && whiteboardJoinCode) {
      const result = await applyTeacherCommand({
        roomId: toWhiteboardRoomId(whiteboardJoinCode),
        command: {
          type: "ASSIGN_GROUPS",
          groups: groupsForWhiteboard,
        },
      });
      if (!result.ok) return { ok: false, error: result.error };
      await applyTeacherCommand({
        roomId: toWhiteboardRoomId(whiteboardJoinCode),
        command: { type: "SET_MODE", mode: "group" },
      });
      if (input.sessionId) {
        await syncClassroomRuntimeSnapshotFromLiveblocks({
          sessionId: input.sessionId,
          roomId: input.roomId,
          actorUserId: input.actorUserId ?? "system",
        });
      }
      return { ok: true, detail: "Groups sent to whiteboard." };
    }

    if (input.command.type === "SEND_GROUPS_TO_DOCUMENT" && documentRoundId) {
      const round = await getDocumentRoundById(documentRoundId);
      if (!round) return { ok: false, error: "Document round not found." };
      try {
        await applyDocumentTeacherCommand({
          roomId: round.liveblocksRoomId,
          roundId: round.id,
          sessionId: round.sessionId,
          hostUserId: round.createdBy,
          command: {
            type: "ASSIGN_GROUPS",
            groups: groupsForDocument.map((g) => ({
              id: g.id,
              name: g.name,
              memberIds: g.memberIds,
            })),
          },
        });
        if (input.sessionId) {
          await syncClassroomRuntimeSnapshotFromLiveblocks({
            sessionId: input.sessionId,
            roomId: input.roomId,
            actorUserId: input.actorUserId ?? "system",
          });
        }
        return { ok: true, detail: "Groups sent to document." };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not assign groups.";
        return { ok: false, error: message };
      }
    }

    if (input.command.type === "SEND_GROUPS_TO_WORD_CARDS" && wordCardsJoinCode) {
      const round = await getWordCardRoundByJoinCode(wordCardsJoinCode);
      if (!round) return { ok: false, error: "Word cards round not found." };
      try {
        await applyWordCardsTeacherCommand({
          roomId: round.liveblocksRoomId ?? toWordCardsRoomId(wordCardsJoinCode),
          roundId: round.id,
          sessionId: round.sessionId,
          hostUserId: round.createdBy,
          command: {
            type: "ASSIGN_GROUPS",
            groups: groupsForWordCards.map((g) => ({
              id: g.id,
              name: g.name,
              memberIds: g.memberIds,
            })),
          },
        });
        if (input.sessionId) {
          await syncClassroomRuntimeSnapshotFromLiveblocks({
            sessionId: input.sessionId,
            roomId: input.roomId,
            actorUserId: input.actorUserId ?? "system",
          });
        }
        return { ok: true, detail: "Groups sent to word cards." };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not assign groups.";
        return { ok: false, error: message };
      }
    }

    // Student status is transient for this first migration. Every other
    // teacher command is mirrored after Liveblocks has accepted the mutation.
    if (input.sessionId && input.command.type !== "SET_OWN_STATUS") {
      await syncClassroomRuntimeSnapshotFromLiveblocks({
        sessionId: input.sessionId,
        roomId: input.roomId,
        actorUserId: input.actorUserId ?? "system",
      });
    }

    try {
      await liveblocks.broadcastEvent(input.roomId, {
        type: "TOOLS_UPDATED",
        command: input.command.type,
      });
    } catch {
      // best-effort
    }

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Tool command failed.",
    };
  }
}
