import "server-only";

import { LiveObject } from "@liveblocks/client";
import { getLiveblocksServerClient } from "@/lib/live-game/server/liveblocks-client";
import {
  boardIdForScope,
  submissionIdempotencyKey,
  type BoardBackground,
  type BoardOwnerType,
  type BoardStatus,
  type SubmissionType,
  type TimerState,
  type WhiteboardElement,
  type WhiteboardRoundPhase,
} from "@/lib/whiteboard/domain";
import { createBoardLiveObject } from "@/lib/whiteboard/liveblocks/initial-storage";
import { assertTransition } from "@/lib/whiteboard/state-machine";
import {
  addTime,
  expireTimer,
  pauseTimer,
  resetTimer,
  resumeTimer,
  startTimer,
} from "@/lib/whiteboard/timer";
import {
  boardDocumentToJson,
  boardDocumentFromJson,
  serializeBoard,
  type PlainBoardSnapshot,
} from "@/lib/whiteboard/serialization";
import { persistSubmission, upsertRoundMeta } from "@/lib/whiteboard/server/persistence";
import { pngToDataUrl, renderBoardPng } from "@/lib/whiteboard/server/render-preview";
import {
  recordWhiteboardAward,
  writeWhiteboardAudit,
} from "@/lib/whiteboard/server/audit";
import { persistBoardFeedback } from "@/lib/whiteboard/server/feedback";
import {
  uploadWhiteboardPreview,
  whiteboardPreviewPublicPath,
} from "@/lib/whiteboard/server/storage-exports";
import { canGroupMemberSubmit } from "@/lib/whiteboard/group-policy";
import type { GroupSubmitPolicy } from "@/lib/whiteboard/domain";
import {
  canPushBoardForReview,
  findWhiteboardGroupForUser,
  planAssignWhiteboardGroups,
  type AssignWhiteboardGroupsInput,
} from "@/lib/whiteboard/group-membership";
import {
  createCompareReviewTask,
  createShowReviewTask,
  readReviewFromRuntime,
  revealReviewTaskResults,
  setReviewTaskKind,
  submitReviewResponse,
  syncReviewToRuntime,
  type ReviewTaskKind,
} from "@/lib/whiteboard/review-task";
import {
  normalizeTeacherWhiteboardCommand,
  type IncomingTeacherWhiteboardCommand,
} from "@/lib/whiteboard/server/normalize-command";

export type TeacherWhiteboardCommand =
  | { type: "OPEN_BOARDS" }
  | { type: "LOCK_BOARDS" }
  | { type: "COLLECT_ALL" }
  | { type: "START_TIMER"; durationMs: number }
  | { type: "PAUSE_TIMER" }
  | { type: "RESUME_TIMER" }
  | { type: "ADD_TIME"; milliseconds: number }
  | { type: "RESET_TIMER"; durationMs: number }
  | { type: "RETURN_BOARD"; boardId: string; feedback?: string }
  | { type: "CLEAR_BOARD"; boardId: string }
  | {
      type: "DISPLAY_BOARD";
      boardId: string;
      anonymous: boolean;
      taskKind?: ReviewTaskKind;
      prompt?: string;
    }
  | { type: "CLEAR_DISPLAY" }
  | { type: "SET_MODE"; mode: "individual" | "group" | "teacher_demo" }
  | { type: "ASSIGN_GROUPS"; groups: { id: string; name: string; memberIds: string[] }[] }
  | { type: "END_ROUND" }
  | { type: "ENTER_REVIEW" }
  | {
      type: "SET_BACKGROUND";
      assetId: string | null;
      url: string | null;
      fit?: "contain" | "cover";
      opacity?: number;
    }
  | { type: "SET_BOARD_HINT"; boardId: string; message: string }
  | { type: "CLEAR_BOARD_HINT"; boardId: string }
  | { type: "AWARD_STUDENT"; studentId: string; rewardType: string }
  | {
      type: "COMPARE_BOARDS";
      boardIds: [string, string];
      anonymous: boolean;
      taskKind?: ReviewTaskKind;
      prompt?: string;
    }
  | { type: "CLEAR_COMPARE" }
  | { type: "SET_REVIEW_TASK"; taskKind: ReviewTaskKind; prompt?: string }
  | { type: "REVEAL_RESULTS" }
  | { type: "DUPLICATE_ROUND" }
  | { type: "SET_GROUP_SUBMIT_POLICY"; policy: "any_member" | "leader_only" | "everyone_ready" }
  | { type: "SET_GROUP_LEADER"; groupId: string; leaderId: string }
  | { type: "REVISE" };

type MutatorNode = {
  get: (key: string) => unknown;
  set: (key: string, value: unknown) => void;
};

type MutatorMap = {
  get: (key: string) => MutatorNode | undefined;
  set: (key: string, value: unknown) => void;
  has: (key: string) => boolean;
  delete: (key: string) => void;
  entries: () => IterableIterator<[string, MutatorNode]>;
  keys: () => IterableIterator<string>;
};

type MutatorList = {
  length: number;
  push: (value: string) => void;
  delete: (index: number) => void;
  indexOf: (value: string) => number;
  [Symbol.iterator]: () => Iterator<string>;
};

type MutatorRoot = {
  get: (key: string) => unknown;
};

function asRoot(root: unknown): MutatorRoot {
  return root as MutatorRoot;
}

function runtimeOf(root: MutatorRoot): MutatorNode {
  return root.get("runtime") as MutatorNode;
}

function boardsOf(root: MutatorRoot): MutatorMap {
  return root.get("boards") as MutatorMap;
}

function participantsOf(root: MutatorRoot): MutatorMap {
  return root.get("participants") as MutatorMap;
}

function groupsOf(root: MutatorRoot): MutatorMap {
  return root.get("groups") as MutatorMap;
}

function submissionsOf(root: MutatorRoot): MutatorMap {
  return root.get("submissions") as MutatorMap;
}

function readBoardSnapshot(board: MutatorNode): PlainBoardSnapshot {
  const elementsMap = board.get("elements") as MutatorMap & {
    entries: () => IterableIterator<[string, WhiteboardElement]>;
  };
  const zOrder = board.get("zOrder") as MutatorList;
  const elements: Record<string, WhiteboardElement> = {};
  for (const [id, el] of elementsMap.entries()) {
    elements[id] = el as unknown as WhiteboardElement;
  }
  return {
    id: board.get("id") as string,
    ownerType: board.get("ownerType") as PlainBoardSnapshot["ownerType"],
    ownerId: board.get("ownerId") as string,
    status: board.get("status") as PlainBoardSnapshot["status"],
    revision: board.get("revision") as number,
    submittedAt: board.get("submittedAt") as number | null,
    elements,
    zOrder: [...zOrder],
  };
}

function snapshotBoard(
  root: MutatorRoot,
  boardId: string,
  submissionType: SubmissionType,
  nowMs: number,
): void {
  const board = boardsOf(root).get(boardId);
  if (!board) return;
  if (board.get("ownerType") === "teacher") return;

  const runtime = runtimeOf(root);
  const roundId = runtime.get("roundId") as string;
  const revision = board.get("revision") as number;
  const key = submissionIdempotencyKey(roundId, boardId, revision);
  const submissions = submissionsOf(root);
  if (submissions.has(key)) return;

  const snapshot = serializeBoard(readBoardSnapshot(board));
  const ownerType = board.get("ownerType") as string;
  const ownerId = board.get("ownerId") as string;
  let contributorIds: string[] = [];
  if (ownerType === "student") {
    contributorIds = [ownerId];
  } else if (ownerType === "group") {
    const group = groupsOf(root).get(ownerId);
    contributorIds = group ? ([...(group.get("memberIds") as string[])] as string[]) : [];
  }

  submissions.set(
    key,
    new LiveObject({
      id: key,
      boardId,
      ownerType,
      ownerId,
      contributorIds,
      revision,
      submissionType,
      documentJson: boardDocumentToJson(snapshot),
      submittedAt: nowMs,
      previewDataUrl: null,
    }),
  );
}

function existingGroupOwnerIds(boards: MutatorMap): string[] {
  const ids: string[] = [];
  for (const [, board] of boards.entries()) {
    if (board.get("ownerType") === "group") {
      ids.push(String(board.get("ownerId") ?? ""));
    }
  }
  return ids.filter(Boolean);
}

function activeGroupIdsOf(root: MutatorRoot): string[] {
  return [...groupsOf(root).keys()];
}

function assertBoardPushTarget(root: MutatorRoot, boardId: string): void {
  const board = boardsOf(root).get(boardId);
  if (!board) throw new Error("Board not found.");
  if (
    !canPushBoardForReview({
      status: String(board.get("status") ?? ""),
      ownerType: String(board.get("ownerType") ?? ""),
      ownerId: String(board.get("ownerId") ?? ""),
      activeGroupIds: activeGroupIdsOf(root),
    })
  ) {
    throw new Error(
      "That board is not ready for class review (or it is an orphaned group).",
    );
  }
}

/** Apply group assignment + orphan-and-lock inside an open mutateStorage callback. */
export function applyAssignGroupsInStorage(
  root: MutatorRoot,
  incoming: AssignWhiteboardGroupsInput,
): { groupCount: number; orphanCount: number } {
  const groups = groupsOf(root);
  const boards = boardsOf(root);
  const participants = participantsOf(root);
  const runtime = runtimeOf(root);
  const phase = runtime.get("phase") as WhiteboardRoundPhase;
  const activeStatus: BoardStatus =
    phase === "OPEN" || phase === "PAUSED" || phase === "REVISION" ? "ACTIVE" : "WAITING";

  const plan = planAssignWhiteboardGroups({
    incoming,
    existingGroupOwnerIds: existingGroupOwnerIds(boards),
  });

  runtime.set("mode", "group");

  for (const key of [...groups.keys()]) {
    if (!plan.groups.some((g) => g.id === key)) {
      groups.delete(key);
    }
  }

  for (const g of plan.groups) {
    groups.set(
      g.id,
      new LiveObject({
        id: g.id,
        name: g.name,
        memberIds: g.memberIds,
        leaderId: g.leaderId,
      }),
    );
    const boardId = boardIdForScope({ type: "group", groupId: g.id });
    if (!boards.has(boardId)) {
      const board = createBoardLiveObject({
        id: boardId,
        ownerType: "group",
        ownerId: g.id,
      });
      board.set("status", activeStatus);
      boards.set(boardId, board);
    } else {
      const board = boards.get(boardId);
      if (board) {
        if (board.get("status") === "LOCKED") {
          board.set("status", activeStatus);
        }
      }
    }
  }

  for (const ownerId of plan.orphanOwnerIds) {
    const boardId = boardIdForScope({ type: "group", groupId: ownerId });
    const board = boards.get(boardId);
    if (board) board.set("status", "LOCKED");
  }

  for (const [userId, p] of participants.entries()) {
    if (p.get("role") === "host") continue;
    const membership = findWhiteboardGroupForUser(plan.groups, userId);
    p.set("groupId", membership?.id ?? null);
  }

  return { groupCount: plan.groups.length, orphanCount: plan.orphanOwnerIds.length };
}

function ensureStudentBoards(root: MutatorRoot): void {
  const mode = runtimeOf(root).get("mode") as string;
  const boards = boardsOf(root);
  const participants = participantsOf(root);

  if (mode === "individual" || mode === "teacher_demo") {
    for (const [userId, participant] of participants.entries()) {
      if (participant.get("role") === "host") continue;
      const id = boardIdForScope({ type: "student", studentId: userId });
      if (!boards.has(id)) {
        boards.set(id, createBoardLiveObject({
          id,
          ownerType: "student",
          ownerId: userId,
        }));
      }
    }
  }
}

function setAllStudentBoardsStatus(root: MutatorRoot, status: BoardStatus): void {
  for (const [, board] of boardsOf(root).entries()) {
    if (board.get("ownerType") === "teacher") continue;
    board.set("status", status);
  }
}

export async function applyTeacherCommand(input: {
  roomId: string;
  command: IncomingTeacherWhiteboardCommand | TeacherWhiteboardCommand;
  nowMs?: number;
  actorId?: string;
}): Promise<
  | { ok: true; phase: string; awardId?: string; vcSessionId: string | null }
  | { ok: false; error: string }
> {
  const nowMs = input.nowMs ?? Date.now();
  const liveblocks = getLiveblocksServerClient();
  let awardId: string | undefined;
  const command = normalizeTeacherWhiteboardCommand(
    input.command as IncomingTeacherWhiteboardCommand,
  );

  try {
    let phase = "WAITING";
    let roundIdForAudit = "";
    let returnSubmissionId: string | null = null;
    let vcSessionId: string | null = null;
    await liveblocks.mutateStorage(input.roomId, ({ root }) => {
      const storageRoot = asRoot(root);
      const runtime = runtimeOf(storageRoot);
      const currentPhase = runtime.get("phase") as WhiteboardRoundPhase;
      phase = currentPhase;
      roundIdForAudit = runtime.get("roundId") as string;
      vcSessionId = (runtime.get("sessionId") as string | null) ?? null;

      switch (command.type) {
        case "OPEN_BOARDS": {
          if (currentPhase === "REVIEW") {
            assertTransition("REVIEW", "OPEN");
          } else {
            assertTransition(currentPhase, "OPEN");
          }
          ensureStudentBoards(storageRoot);
          runtime.set("phase", "OPEN");
          const timer = runtime.get("timer") as TimerState;
          const settings = runtime.get("settings") as { defaultTimerMs: number };
          if (timer.status === "idle" || timer.status === "expired") {
            runtime.set("timer", startTimer(timer, settings.defaultTimerMs, nowMs));
          }
          // Re-open returned/active boards; leave submitted as-is until returned.
          for (const [, board] of boardsOf(storageRoot).entries()) {
            if (board.get("ownerType") === "teacher") continue;
            const status = board.get("status") as BoardStatus;
            if (
              status === "WAITING" ||
              status === "RETURNED" ||
              status === "ACTIVE" ||
              currentPhase === "WAITING"
            ) {
              board.set("status", "ACTIVE");
            }
          }
          phase = "OPEN";
          break;
        }
        case "LOCK_BOARDS": {
          setAllStudentBoardsStatus(storageRoot, "LOCKED");
          break;
        }
        case "COLLECT_ALL": {
          if (currentPhase === "COLLECTED" || currentPhase === "REVIEW" || currentPhase === "ENDED") {
            phase = currentPhase;
            break;
          }
          if (currentPhase !== "COLLECTING") {
            if (
              currentPhase !== "OPEN" &&
              currentPhase !== "PAUSED" &&
              currentPhase !== "REVISION"
            ) {
              throw new Error("Collect is only available during Active or Revision.");
            }
            assertTransition(currentPhase, "COLLECTING");
            runtime.set("phase", "COLLECTING");
          }
          for (const [boardId, board] of boardsOf(storageRoot).entries()) {
            if (board.get("ownerType") === "teacher") continue;
            const status = board.get("status") as BoardStatus;
            if (status !== "SUBMITTED" && status !== "AUTO_SUBMITTED") {
              board.set("status", "AUTO_SUBMITTED");
              board.set("submittedAt", nowMs);
            }
            snapshotBoard(storageRoot, boardId, "teacher_pull", nowMs);
          }
          assertTransition("COLLECTING", "COLLECTED");
          runtime.set("phase", "COLLECTED");
          runtime.set("timer", expireTimer(runtime.get("timer") as TimerState));
          phase = "COLLECTED";
          break;
        }
        case "START_TIMER": {
          runtime.set(
            "timer",
            startTimer(runtime.get("timer") as TimerState, command.durationMs, nowMs),
          );
          break;
        }
        case "PAUSE_TIMER": {
          if (currentPhase === "OPEN") {
            assertTransition("OPEN", "PAUSED");
            runtime.set("phase", "PAUSED");
            phase = "PAUSED";
          }
          runtime.set("timer", pauseTimer(runtime.get("timer") as TimerState, nowMs));
          break;
        }
        case "RESUME_TIMER": {
          if (currentPhase === "PAUSED") {
            assertTransition("PAUSED", "OPEN");
            runtime.set("phase", "OPEN");
            phase = "OPEN";
          }
          runtime.set("timer", resumeTimer(runtime.get("timer") as TimerState, nowMs));
          break;
        }
        case "ADD_TIME": {
          runtime.set(
            "timer",
            addTime(runtime.get("timer") as TimerState, command.milliseconds),
          );
          break;
        }
        case "RESET_TIMER": {
          runtime.set("timer", resetTimer(command.durationMs));
          break;
        }
        case "RETURN_BOARD": {
          const board = boardsOf(storageRoot).get(command.boardId);
          if (!board) throw new Error("Board not found.");
          const priorRevision = board.get("revision") as number;
          const feedback = command.feedback?.trim();
          if (feedback) {
            board.set("privateHint", feedback.slice(0, 1000));
            returnSubmissionId = `${roundIdForAudit}:${command.boardId}:${priorRevision}`;
          }
          board.set("revision", priorRevision + 1);
          board.set("status", "RETURNED");
          board.set("submittedAt", null);
          break;
        }
        case "CLEAR_BOARD": {
          const board = boardsOf(storageRoot).get(command.boardId);
          if (!board) throw new Error("Board not found.");
          const elements = board.get("elements") as MutatorMap;
          const zOrder = board.get("zOrder") as MutatorList;
          for (const key of [...elements.keys()]) elements.delete(key);
          while (zOrder.length > 0) zOrder.delete(0);
          break;
        }
        case "DISPLAY_BOARD": {
          assertBoardPushTarget(storageRoot, command.boardId);
          syncReviewToRuntime(
            runtime,
            createShowReviewTask({
              boardId: command.boardId,
              anonymous: command.anonymous,
              taskKind: command.taskKind,
              prompt: command.prompt,
            }),
          );
          if (currentPhase === "COLLECTED") {
            assertTransition(currentPhase, "REVIEW");
            runtime.set("phase", "REVIEW");
            phase = "REVIEW";
          }
          break;
        }
        case "CLEAR_DISPLAY": {
          syncReviewToRuntime(runtime, null);
          break;
        }
        case "SET_MODE": {
          runtime.set("mode", command.mode);
          break;
        }
        case "ASSIGN_GROUPS": {
          if (currentPhase === "ENDED") {
            throw new Error("Cannot assign groups after Complete.");
          }
          const result = applyAssignGroupsInStorage(storageRoot, {
            groups: command.groups,
          });
          if (result.groupCount === 0) {
            throw new Error("No non-empty groups to assign.");
          }
          break;
        }
        case "ENTER_REVIEW": {
          assertTransition(currentPhase, "REVIEW");
          runtime.set("phase", "REVIEW");
          phase = "REVIEW";
          break;
        }
        case "SET_BACKGROUND": {
          runtime.set("background", {
            assetId: command.assetId,
            url: command.url,
            fit: command.fit ?? "contain",
            opacity: command.opacity ?? 1,
          });
          break;
        }
        case "SET_BOARD_HINT": {
          const board = boardsOf(storageRoot).get(command.boardId);
          if (!board) throw new Error("Board not found.");
          board.set("privateHint", command.message.slice(0, 400));
          break;
        }
        case "CLEAR_BOARD_HINT": {
          const board = boardsOf(storageRoot).get(command.boardId);
          if (!board) throw new Error("Board not found.");
          board.set("privateHint", null);
          break;
        }
        case "AWARD_STUDENT": {
          const participant = participantsOf(storageRoot).get(command.studentId);
          if (!participant) throw new Error("Student not found.");
          const count = (participant.get("rewardCount") as number | undefined) ?? 0;
          const next = count + 1;
          participant.set("rewardCount", next);
          awardId = `wb:${roundIdForAudit}:${command.studentId}:${next}`;
          break;
        }
        case "COMPARE_BOARDS": {
          assertBoardPushTarget(storageRoot, command.boardIds[0]);
          assertBoardPushTarget(storageRoot, command.boardIds[1]);
          syncReviewToRuntime(
            runtime,
            createCompareReviewTask({
              boardIds: command.boardIds,
              anonymous: command.anonymous,
              taskKind: command.taskKind,
              prompt: command.prompt,
            }),
          );
          if (currentPhase === "COLLECTED") {
            assertTransition(currentPhase, "REVIEW");
            runtime.set("phase", "REVIEW");
            phase = "REVIEW";
          }
          break;
        }
        case "CLEAR_COMPARE": {
          syncReviewToRuntime(runtime, null);
          break;
        }
        case "SET_REVIEW_TASK": {
          const current = readReviewFromRuntime(runtime);
          if (!current) throw new Error("Show or Compare a board first.");
          syncReviewToRuntime(
            runtime,
            setReviewTaskKind(current, command.taskKind, command.prompt),
          );
          break;
        }
        case "REVEAL_RESULTS": {
          const current = readReviewFromRuntime(runtime);
          if (!current) throw new Error("Show or Compare a board first.");
          syncReviewToRuntime(runtime, revealReviewTaskResults(current));
          break;
        }
        case "REVISE": {
          if (currentPhase !== "COLLECTED" && currentPhase !== "REVIEW") {
            throw new Error("Revise starts after Collect.");
          }
          assertTransition(currentPhase, "REVISION");
          syncReviewToRuntime(runtime, null);
          runtime.set("phase", "REVISION");
          for (const [, board] of boardsOf(storageRoot).entries()) {
            if (board.get("ownerType") === "teacher") continue;
            if (board.get("status") === "RETURNED") {
              board.set("status", "ACTIVE");
            }
          }
          phase = "REVISION";
          break;
        }
        case "DUPLICATE_ROUND": {
          // Signal only — host route creates the new room; storage keeps current round intact.
          break;
        }
        case "SET_GROUP_SUBMIT_POLICY": {
          const settings = {
            ...(runtime.get("settings") as Record<string, unknown>),
            groupSubmitPolicy: command.policy,
          };
          runtime.set("settings", settings);
          break;
        }
        case "SET_GROUP_LEADER": {
          const group = groupsOf(storageRoot).get(command.groupId);
          if (!group) throw new Error("Group not found.");
          const members = (group.get("memberIds") as string[]) ?? [];
          if (!members.includes(command.leaderId)) {
            throw new Error("Leader must be a group member.");
          }
          group.set("leaderId", command.leaderId);
          break;
        }
        case "END_ROUND": {
          if (currentPhase !== "ENDED") {
            if (currentPhase === "COLLECTED" || currentPhase === "REVIEW") {
              assertTransition(currentPhase, "ENDED");
            } else if (
              currentPhase === "OPEN" ||
              currentPhase === "PAUSED" ||
              currentPhase === "REVISION"
            ) {
              assertTransition(currentPhase, "COLLECTING");
              runtime.set("phase", "COLLECTING");
              for (const [boardId, board] of boardsOf(storageRoot).entries()) {
                if (board.get("ownerType") === "teacher") continue;
                const status = board.get("status") as BoardStatus;
                if (status !== "SUBMITTED" && status !== "AUTO_SUBMITTED") {
                  board.set("status", "AUTO_SUBMITTED");
                  board.set("submittedAt", nowMs);
                }
                snapshotBoard(storageRoot, boardId, "teacher_pull", nowMs);
              }
              runtime.set("phase", "COLLECTED");
              assertTransition("COLLECTED", "ENDED");
            } else {
              throw new Error(`Cannot end round from ${currentPhase}`);
            }
            runtime.set("phase", "ENDED");
            phase = "ENDED";
          }
          break;
        }
        default:
          throw new Error("Unknown command");
      }
    });

    try {
      await liveblocks.broadcastEvent(input.roomId, {
        type: command.type,
        ...(command.type === "AWARD_STUDENT"
          ? {
              studentId: command.studentId,
              rewardType: command.rewardType,
              awardId,
            }
          : {}),
      });
    } catch {
      // best-effort
    }

    if (command.type === "AWARD_STUDENT" && awardId && input.actorId) {
      await recordWhiteboardAward({
        awardId,
        roundId: roundIdForAudit,
        studentId: command.studentId,
        teacherId: input.actorId,
        rewardType: command.rewardType,
      }).catch(() => undefined);
    }

    if (
      command.type === "RETURN_BOARD" &&
      input.actorId &&
      returnSubmissionId &&
      command.feedback?.trim()
    ) {
      await persistBoardFeedback({
        submissionId: returnSubmissionId,
        teacherId: input.actorId,
        message: command.feedback,
        feedbackType: "return",
        metadata: { boardId: command.boardId },
      }).catch(() => undefined);
    }

    if (roundIdForAudit) {
      await writeWhiteboardAudit({
        roundId: roundIdForAudit,
        actorId: input.actorId,
        eventType: command.type,
        payload: command as unknown as Record<string, unknown>,
      }).catch(() => undefined);
    }

    if (
      command.type === "COLLECT_ALL" ||
      command.type === "END_ROUND"
    ) {
      await enrichSubmissionPreviews(input.roomId).catch(() => undefined);
    }

    return { ok: true, phase, awardId, vcSessionId };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Command failed.",
    };
  }
}

export async function applyStudentReviewResponse(input: {
  roomId: string;
  userId: string;
  choice?: string | null;
  note?: string;
  nowMs?: number;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const nowMs = input.nowMs ?? Date.now();
  const liveblocks = getLiveblocksServerClient();

  try {
    await liveblocks.mutateStorage(input.roomId, ({ root }) => {
      const storageRoot = asRoot(root);
      const runtime = runtimeOf(storageRoot);
      const reviewTask = readReviewFromRuntime(runtime);
      if (!reviewTask) {
        throw new Error("No class review task is active.");
      }
      syncReviewToRuntime(
        runtime,
        submitReviewResponse(reviewTask, {
          studentId: input.userId,
          choice: input.choice,
          note: input.note,
          nowMs,
        }),
      );
    });

    try {
      await liveblocks.broadcastEvent(input.roomId, {
        type: "REVIEW_RESPONSE",
        studentId: input.userId,
      });
    } catch {
      // best-effort
    }

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Review response failed.",
    };
  }
}

export async function applyStudentSetReady(input: {
  roomId: string;
  userId: string;
  ready: boolean;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const liveblocks = getLiveblocksServerClient();
  try {
    await liveblocks.mutateStorage(input.roomId, ({ root }) => {
      const storageRoot = asRoot(root);
      const participants = participantsOf(storageRoot);
      const p = participants.get(input.userId);
      if (!p) throw new Error("Join the whiteboard first.");
      p.set("ready", Boolean(input.ready));
    });
    try {
      await liveblocks.broadcastEvent(input.roomId, {
        type: "SET_READY",
        userId: input.userId,
        ready: Boolean(input.ready),
      });
    } catch {
      // best-effort
    }
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Ready update failed.",
    };
  }
}

export async function applyStudentSubmit(input: {
  roomId: string;
  userId: string;
  boardId: string;
  nowMs?: number;
  /** Optional stage timer (collab diagnostics). */
  measure?: <T>(name: string, operation: () => Promise<T> | T) => Promise<T>;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const nowMs = input.nowMs ?? Date.now();
  const liveblocks = getLiveblocksServerClient();
  const measure =
    input.measure ??
    (async <T>(_name: string, operation: () => Promise<T> | T) => operation());

  try {
    await measure("mutateStorage", () =>
      liveblocks.mutateStorage(input.roomId, ({ root }) => {
        const storageRoot = asRoot(root);
        const runtime = runtimeOf(storageRoot);
        const phase = runtime.get("phase") as string;
        if (phase !== "OPEN" && phase !== "PAUSED" && phase !== "REVISION") {
          throw new Error("Activity is not open for submission.");
        }
        const settings = runtime.get("settings") as { allowEarlySubmit: boolean };
        if (!settings.allowEarlySubmit) {
          throw new Error("Early submission is disabled.");
        }

        const board = boardsOf(storageRoot).get(input.boardId);
        if (!board) throw new Error("Board not found.");

        const ownerType = board.get("ownerType") as string;
        const ownerId = board.get("ownerId") as string;
        if (ownerType === "student" && ownerId !== input.userId) {
          throw new Error("Not your board.");
        }
        if (ownerType === "group") {
          const group = groupsOf(storageRoot).get(ownerId);
          const members = (group?.get("memberIds") as string[] | undefined) ?? [];
          if (!members.includes(input.userId)) throw new Error("Not a group member.");
          const settingsFull = runtime.get("settings") as {
            allowEarlySubmit: boolean;
            groupSubmitPolicy?: GroupSubmitPolicy;
          };
          const policy = settingsFull.groupSubmitPolicy ?? "any_member";
          const readyMemberIds: string[] = [];
          for (const memberId of members) {
            const p = participantsOf(storageRoot).get(memberId);
            if (p?.get("ready")) readyMemberIds.push(memberId);
          }
          if (
            !canGroupMemberSubmit({
              policy,
              userId: input.userId,
              leaderId: (group?.get("leaderId") as string | null) ?? null,
              memberIds: members,
              readyMemberIds,
            })
          ) {
            throw new Error(
              policy === "leader_only"
                ? "Only the group leader can submit."
                : "Everyone in the group must be ready before submit.",
            );
          }
        }
        if (ownerType === "teacher") throw new Error("Cannot submit teacher board.");

        const status = board.get("status") as BoardStatus;
        if (status === "SUBMITTED" || status === "AUTO_SUBMITTED" || status === "LOCKED") {
          throw new Error("Board already submitted or locked.");
        }

        board.set("status", "SUBMITTED");
        board.set("submittedAt", nowMs);
        snapshotBoard(storageRoot, input.boardId, "manual", nowMs);
      }),
    );
    await measure("enrichPreviews", () =>
      enrichSubmissionPreviews(input.roomId).catch(() => undefined),
    );
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Submit failed.",
    };
  }
}

export async function ensureParticipantAndBoard(input: {
  roomId: string;
  userId: string;
  displayName: string;
  color: string;
  role: "host" | "player";
}): Promise<void> {
  const liveblocks = getLiveblocksServerClient();
  await liveblocks.mutateStorage(input.roomId, ({ root }) => {
    const storageRoot = asRoot(root);
    const participants = participantsOf(storageRoot);
    if (!participants.has(input.userId)) {
      participants.set(
        input.userId,
        new LiveObject({
          name: input.displayName,
          color: input.color,
          role: input.role,
          joinedAt: Date.now(),
          groupId: null,
          ready: false,
          rewardCount: 0,
        }),
      );
    }

    const mode = runtimeOf(storageRoot).get("mode") as string;
    if (input.role === "player" && (mode === "individual" || mode === "teacher_demo")) {
      const boards = boardsOf(storageRoot);
      const id = boardIdForScope({ type: "student", studentId: input.userId });
      if (!boards.has(id)) {
        boards.set(
          id,
          createBoardLiveObject({
            id,
            ownerType: "student",
            ownerId: input.userId,
          }),
        );
      }
    }
  });
}

export async function enrichSubmissionPreviews(roomId: string): Promise<void> {
  const liveblocks = getLiveblocksServerClient();
  const pending: {
    key: string;
    boardId: string;
    documentJson: string;
    ownerType: BoardOwnerType;
    ownerId: string;
    contributorIds: string[];
    revision: number;
    submissionType: SubmissionType;
    roundId: string;
  }[] = [];

  let background: BoardBackground | null = null;
  let roundMeta: {
    roundId: string;
    joinCode: string;
    hostUserId: string;
    phase: string;
    mode: string;
    prompt: { title: string; instructions: string };
    settings: unknown;
    sessionId: string | null;
    classId: string | null;
  } | null = null;

  const pendingLocal: typeof pending = [];

  await liveblocks.mutateStorage(roomId, ({ root }) => {
    const storageRoot = asRoot(root);
    const runtime = runtimeOf(storageRoot);
    background = (runtime.get("background") as BoardBackground) ?? null;
    const roundId = runtime.get("roundId") as string;
    roundMeta = {
      roundId,
      joinCode: runtime.get("joinCode") as string,
      hostUserId: runtime.get("hostUserId") as string,
      phase: runtime.get("phase") as string,
      mode: runtime.get("mode") as string,
      prompt: runtime.get("prompt") as { title: string; instructions: string },
      settings: runtime.get("settings"),
      sessionId: (runtime.get("sessionId") as string | null) ?? null,
      classId: (runtime.get("classId") as string | null) ?? null,
    };
    for (const [key, submission] of submissionsOf(storageRoot).entries()) {
      const existing = submission.get("previewDataUrl") as string | null;
      if (existing && !existing.startsWith("data:")) continue;
      if (existing?.startsWith("data:")) {
        // Re-process data URLs into storage paths (P3).
      } else if (existing) {
        continue;
      }
      pendingLocal.push({
        key,
        boardId: submission.get("boardId") as string,
        documentJson: submission.get("documentJson") as string,
        ownerType: submission.get("ownerType") as BoardOwnerType,
        ownerId: submission.get("ownerId") as string,
        contributorIds: (submission.get("contributorIds") as string[]) ?? [],
        revision: submission.get("revision") as number,
        submissionType: submission.get("submissionType") as SubmissionType,
        roundId,
      });
    }
  });

  pending.push(...pendingLocal);

  const metaSnapshot = roundMeta as {
    roundId: string;
    joinCode: string;
    hostUserId: string;
    phase: string;
    mode: string;
    prompt: { title: string; instructions: string };
    settings: unknown;
    sessionId: string | null;
    classId: string | null;
  } | null;

  if (metaSnapshot) {
    await upsertRoundMeta({
      roundId: metaSnapshot.roundId,
      liveblocksRoomId: roomId,
      joinCode: metaSnapshot.joinCode,
      hostUserId: metaSnapshot.hostUserId,
      phase: metaSnapshot.phase,
      mode: metaSnapshot.mode,
      prompt: metaSnapshot.prompt,
      settings: metaSnapshot.settings,
      background,
      sessionId: metaSnapshot.sessionId,
      classId: metaSnapshot.classId,
    }).catch(() => undefined);
  }
  for (const item of pending) {
    try {
      const document = boardDocumentFromJson(item.documentJson);
      const png = await renderBoardPng({ document, background, maxWidth: 360 });
      const previewPath = await uploadWhiteboardPreview({
        roundId: item.roundId,
        boardId: item.boardId,
        revision: item.revision,
        png,
      });
      const previewUrl = previewPath
        ? whiteboardPreviewPublicPath(previewPath)
        : pngToDataUrl(png);
      await liveblocks.mutateStorage(roomId, ({ root }) => {
        const storageRoot = asRoot(root);
        const submission = submissionsOf(storageRoot).get(item.key);
        submission?.set("previewDataUrl", previewUrl);
        const board = boardsOf(storageRoot).get(item.boardId);
        board?.set("previewDataUrl", previewUrl);
      });
      await persistSubmission({
        roundId: item.roundId,
        liveblocksRoomId: roomId,
        boardId: item.boardId,
        ownerType: item.ownerType,
        ownerId: item.ownerId,
        contributorIds: item.contributorIds,
        revision: item.revision,
        submissionType: item.submissionType,
        document,
        previewPath,
        previewDataUrl: previewPath ? null : previewUrl,
      });
    } catch {
      // Preview generation is best-effort.
    }
  }
}
