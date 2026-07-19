import { describe, expect, it } from "vitest";
import {
  canEditActivityWork,
  canSubmitActivityWork,
} from "@/lib/activity-runtime/activity-permissions";
import {
  normalizeWorkStatus,
  studentFacingState,
  toRuntimePhase,
} from "@/lib/activity-runtime/activity-phases";
import { teacherControlLabel } from "@/lib/activity-runtime/activity-commands";
import { canEditBoard, canSubmitBoard } from "@/lib/whiteboard/permissions";
import { canTransition } from "@/lib/whiteboard/state-machine";
import { normalizeTeacherWhiteboardCommand } from "@/lib/whiteboard/server/normalize-command";

describe("whiteboard SET_READY + REVISE (WB-4)", () => {
  it("accepts REVISE teacher command and labels it Revise", () => {
    expect(normalizeTeacherWhiteboardCommand({ type: "REVISE" })).toEqual({
      type: "REVISE",
    });
    expect(teacherControlLabel("REVISE")).toBe("Revise");
  });

  it("maps REVISION phase into shared runtime revision", () => {
    expect(toRuntimePhase("REVISION")).toBe("revision");
    expect(canTransition("COLLECTED", "REVISION")).toBe(true);
    expect(canTransition("REVIEW", "REVISION")).toBe(true);
    expect(canTransition("REVISION", "COLLECTING")).toBe(true);
  });

  it("allows edit/submit during Revision after Return", () => {
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
      canSubmitActivityWork({
        phase: toRuntimePhase("REVISION"),
        workStatus: normalizeWorkStatus("ACTIVE"),
        isOwner: true,
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
  });

  it("blocks edit while still in Collect/Review before Revise", () => {
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
        phase: toRuntimePhase("REVIEW"),
        workStatus: normalizeWorkStatus("RETURNED"),
        role: "player",
        isOwner: true,
        hasReviewPush: false,
      }),
    ).toBe(false);
  });

  it("shows Revision during REVISION and Submitted after resubmit", () => {
    expect(
      studentFacingState({
        phase: "REVISION",
        workStatus: "active",
        hasReviewPush: false,
      }),
    ).toBe("Revision");
    expect(
      studentFacingState({
        phase: "REVISION",
        workStatus: "submitted",
        hasReviewPush: false,
      }),
    ).toBe("Submitted");
  });
});
