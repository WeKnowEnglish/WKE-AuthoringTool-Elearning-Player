import { describe, expect, it } from "vitest";
import {
  canEditActivityWork,
  canSubmitActivityWork,
} from "@/lib/activity-runtime/activity-permissions";
import {
  fromRuntimePhaseToWhiteboard,
  normalizeWorkStatus,
  studentFacingState,
  toRuntimePhase,
} from "@/lib/activity-runtime/activity-phases";
import { teacherControlLabel } from "@/lib/activity-runtime/activity-commands";
import { WHITEBOARD_INTERACTION_CONFIG } from "@/lib/activity-runtime/activity-interaction-config";
import { getVcActivity, listEnabledVcActivities } from "@/lib/activity-runtime/registry";
import { boardIdForScope } from "@/lib/whiteboard/domain";
import { canGroupMemberSubmit } from "@/lib/whiteboard/group-policy";
import {
  canPushBoardForReview,
  findWhiteboardGroupForUser,
  planAssignWhiteboardGroups,
} from "@/lib/whiteboard/group-membership";
import {
  normalizeWhiteboardLaunchPayload,
  whiteboardLaunchStartLabel,
} from "@/lib/whiteboard/launch-options";
import { canEditBoard, canSubmitBoard } from "@/lib/whiteboard/permissions";
import {
  createCompareReviewTask,
  createShowReviewTask,
  readReviewFromRuntime,
  revealReviewTaskResults,
  submitReviewResponse,
  syncReviewToRuntime,
} from "@/lib/whiteboard/review-task";
import { canTransition } from "@/lib/whiteboard/state-machine";
import { normalizeTeacherWhiteboardCommand } from "@/lib/whiteboard/server/normalize-command";

/**
 * WB-6 — cross-mode regression after lifecycle / review / groups / ready / launch.
 * Individual + group smoke paths must stay green (unit level).
 */
describe("whiteboard WB-6 regression (individual + group)", () => {
  it("registers whiteboard as an enabled VC activity with interaction config", () => {
    const wb = getVcActivity("whiteboard");
    expect(wb?.enabled).toBe(true);
    expect(WHITEBOARD_INTERACTION_CONFIG.pushToStudent).toBe(true);
    expect(WHITEBOARD_INTERACTION_CONFIG.allowRevision).toBe(true);
    expect(WHITEBOARD_INTERACTION_CONFIG.reviewModes).toEqual(
      expect.arrayContaining(["show", "compare"]),
    );
    expect(listEnabledVcActivities().some((a) => a.kind === "whiteboard")).toBe(true);
  });

  it("keeps shared command aliases for the classroom smoke path", () => {
    expect(normalizeTeacherWhiteboardCommand({ type: "OPEN" }).type).toBe("OPEN_BOARDS");
    expect(normalizeTeacherWhiteboardCommand({ type: "COLLECT" }).type).toBe("COLLECT_ALL");
    expect(normalizeTeacherWhiteboardCommand({ type: "COMPLETE" }).type).toBe("END_ROUND");
    expect(normalizeTeacherWhiteboardCommand({ type: "REVISE" }).type).toBe("REVISE");
    expect(normalizeTeacherWhiteboardCommand({ type: "REVEAL_RESULTS" }).type).toBe(
      "REVEAL_RESULTS",
    );
    expect(teacherControlLabel("COLLECT")).toBe("Collect");
    expect(teacherControlLabel("REVISE")).toBe("Revise");
  });

  it("individual: launch → active edit → submitted → class review labels", () => {
    const launch = normalizeWhiteboardLaunchPayload({
      mode: "individual",
      timerMinutes: 4,
      worksheetPresetId: "lined",
    });
    expect(launch.mode).toBe("individual");
    expect(whiteboardLaunchStartLabel("individual")).toBe("Start whiteboard activity");

    const boardId = boardIdForScope({ type: "student", studentId: "u1" });
    expect(boardId).toBe("board:student:u1");

    expect(
      canEditActivityWork({
        phase: toRuntimePhase("OPEN"),
        workStatus: normalizeWorkStatus("ACTIVE"),
        role: "player",
        isOwner: true,
        hasReviewPush: false,
      }),
    ).toBe(true);
    expect(
      canSubmitActivityWork({
        phase: toRuntimePhase("OPEN"),
        workStatus: normalizeWorkStatus("ACTIVE"),
        isOwner: true,
      }),
    ).toBe(true);
    expect(
      studentFacingState({
        phase: "OPEN",
        workStatus: normalizeWorkStatus("SUBMITTED"),
        hasReviewPush: false,
      }),
    ).toBe("Submitted");
    expect(
      studentFacingState({
        phase: "COLLECTED",
        workStatus: normalizeWorkStatus("SUBMITTED"),
        hasReviewPush: false,
      }),
    ).toBe("Class review");
  });

  it("individual: compare → respond → reveal → clear dual-write", () => {
    let review = createCompareReviewTask({
      boardIds: ["board:student:a", "board:student:b"],
      anonymous: true,
      taskKind: "strongest",
    });
    review = submitReviewResponse(review, {
      studentId: "u1",
      choice: "board:student:a",
      nowMs: 1,
    });
    review = revealReviewTaskResults(review);
    expect(review.status).toBe("results");

    const store: Record<string, unknown> = {};
    const runtime = {
      get: (k: string) => store[k],
      set: (k: string, v: unknown) => {
        store[k] = v;
      },
    };
    syncReviewToRuntime(runtime, review);
    expect(readReviewFromRuntime(runtime)?.status).toBe("results");
    expect(store.compareBoardIds).toEqual(["board:student:a", "board:student:b"]);
    syncReviewToRuntime(runtime, null);
    expect(readReviewFromRuntime(runtime)).toBeNull();
    expect(store.review).toBeNull();
  });

  it("individual: return → revise → resubmit/collect phase path", () => {
    expect(canTransition("COLLECTED", "REVISION")).toBe(true);
    expect(canTransition("REVIEW", "REVISION")).toBe(true);
    expect(canTransition("REVISION", "COLLECTING")).toBe(true);
    expect(toRuntimePhase("REVISION")).toBe("revision");
    expect(fromRuntimePhaseToWhiteboard("revision")).toBe("REVISION");

    expect(
      canEditActivityWork({
        phase: toRuntimePhase("COLLECTED"),
        workStatus: normalizeWorkStatus("RETURNED"),
        role: "player",
        isOwner: true,
        hasReviewPush: false,
      }),
    ).toBe(false);
    expect(
      canEditActivityWork({
        phase: toRuntimePhase("REVISION"),
        workStatus: normalizeWorkStatus("ACTIVE"),
        role: "player",
        isOwner: true,
        hasReviewPush: false,
      }),
    ).toBe(true);
    expect(
      canEditBoard({
        phase: "REVISION",
        boardStatus: "ACTIVE",
        timer: {
          status: "expired",
          durationMs: 0,
          startedAt: null,
          pausedAt: null,
          accumulatedPausedMs: 0,
        },
        nowMs: Date.now(),
        userId: "u1",
        role: "player",
        boardOwnerType: "student",
        boardOwnerId: "u1",
      }),
    ).toBe(true);
    expect(
      canSubmitBoard({
        phase: "REVISION",
        boardStatus: "ACTIVE",
        allowEarlySubmit: true,
        userCanEdit: true,
      }),
    ).toBe(true);
    expect(
      studentFacingState({
        phase: "REVISION",
        workStatus: normalizeWorkStatus("ACTIVE"),
        hasReviewPush: false,
      }),
    ).toBe("Revision");
    expect(
      studentFacingState({
        phase: "REVISION",
        workStatus: normalizeWorkStatus("SUBMITTED"),
        hasReviewPush: false,
      }),
    ).toBe("Submitted");
  });

  it("group: launch + assign plan + shared board id + submit policy", () => {
    const launch = normalizeWhiteboardLaunchPayload({ mode: "group", timerMinutes: 5 });
    expect(launch.mode).toBe("group");
    expect(whiteboardLaunchStartLabel("group")).toBe("Start group whiteboard");

    const plan = planAssignWhiteboardGroups({
      incoming: {
        groups: [
          { id: "g1", name: "Blue", memberIds: ["a", "b"] },
          { id: "g2", name: "Red", memberIds: ["c"] },
        ],
      },
      existingGroupOwnerIds: ["g-old"],
    });
    expect(plan.activeBoardIds).toEqual([
      boardIdForScope({ type: "group", groupId: "g1" }),
      boardIdForScope({ type: "group", groupId: "g2" }),
    ]);
    expect(plan.orphanOwnerIds).toEqual(["g-old"]);
    expect(findWhiteboardGroupForUser(plan.groups, "b")?.id).toBe("g1");

    expect(
      canGroupMemberSubmit({
        policy: "any_member",
        userId: "b",
        leaderId: "a",
        memberIds: ["a", "b"],
        readyMemberIds: [],
      }),
    ).toBe(true);
    expect(
      canGroupMemberSubmit({
        policy: "everyone_ready",
        userId: "a",
        leaderId: "a",
        memberIds: ["a", "b"],
        readyMemberIds: ["a"],
      }),
    ).toBe(false);
    expect(
      canGroupMemberSubmit({
        policy: "everyone_ready",
        userId: "a",
        leaderId: "a",
        memberIds: ["a", "b"],
        readyMemberIds: ["a", "b"],
      }),
    ).toBe(true);
  });

  it("group: orphans cannot be Show/Compare targets; active groups can", () => {
    const activeGroupIds = ["g1", "g2"];
    expect(
      canPushBoardForReview({
        status: "LOCKED",
        ownerType: "group",
        ownerId: "g-old",
        activeGroupIds,
      }),
    ).toBe(false);
    expect(
      canPushBoardForReview({
        status: "SUBMITTED",
        ownerType: "group",
        ownerId: "g1",
        activeGroupIds,
      }),
    ).toBe(true);

    const show = createShowReviewTask({
      boardId: boardIdForScope({ type: "group", groupId: "g1" }),
      anonymous: true,
      taskKind: "notice",
    });
    expect(show.boardIds[0]).toBe("board:group:g1");
  });

  it("complete maps to Completed student label", () => {
    expect(toRuntimePhase("ENDED")).toBe("completed");
    expect(
      studentFacingState({
        phase: "ENDED",
        boardStatus: "SUBMITTED",
        hasReviewPush: false,
      }),
    ).toBe("Completed");
  });
});
