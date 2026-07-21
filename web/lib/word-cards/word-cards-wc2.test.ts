import { describe, expect, it } from "vitest";
import {
  canEditActivityWork,
  canSubmitActivityWork,
} from "@/lib/activity-runtime/activity-permissions";
import { studentFacingState, toRuntimePhase } from "@/lib/activity-runtime/activity-phases";
import { teacherControlLabel } from "@/lib/activity-runtime/activity-commands";
import { createEmptyDrawing } from "@/lib/word-cards/liveblocks/initial-storage";

describe("word cards create cycle (WC-2)", () => {
  it("exposes Collect / Return / Revise labels", () => {
    expect(teacherControlLabel("COLLECT")).toBe("Collect");
    expect(teacherControlLabel("RETURN")).toBe("Return");
    expect(teacherControlLabel("REVISE")).toBe("Revise");
  });

  it("allows edit/submit in Active; blocks after Collect until Revise", () => {
    expect(
      canEditActivityWork({
        phase: "active",
        workStatus: "active",
        role: "player",
        isOwner: true,
        hasReviewPush: false,
      }),
    ).toBe(true);
    expect(
      canSubmitActivityWork({
        phase: "active",
        workStatus: "active",
        isOwner: true,
      }),
    ).toBe(true);
    expect(
      canEditActivityWork({
        phase: "collected",
        workStatus: "returned",
        role: "player",
        isOwner: true,
        hasReviewPush: false,
      }),
    ).toBe(false);
    expect(
      canEditActivityWork({
        phase: "revision",
        workStatus: "revising",
        role: "player",
        isOwner: true,
        hasReviewPush: false,
      }),
    ).toBe(true);
    expect(
      canSubmitActivityWork({
        phase: "revision",
        workStatus: "revising",
        isOwner: true,
      }),
    ).toBe(true);
  });

  it("maps student labels across create → submitted → revision", () => {
    expect(
      studentFacingState({
        phase: toRuntimePhase("active"),
        workStatus: "active",
        hasReviewPush: false,
      }),
    ).toBe("Active");
    expect(
      studentFacingState({
        phase: "active",
        workStatus: "submitted",
        hasReviewPush: false,
      }),
    ).toBe("Submitted");
    expect(
      studentFacingState({
        phase: "collected",
        workStatus: "locked",
        hasReviewPush: false,
      }),
    ).toBe("Class review");
    expect(
      studentFacingState({
        phase: "revision",
        workStatus: "revising",
        hasReviewPush: false,
      }),
    ).toBe("Revision");
  });

  it("starts drawings empty for new cards", () => {
    expect(createEmptyDrawing()).toEqual({ strokes: [] });
  });
});
