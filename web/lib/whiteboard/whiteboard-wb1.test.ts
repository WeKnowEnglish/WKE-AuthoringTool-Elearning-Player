import { describe, expect, it } from "vitest";
import {
  canEditActivityWork,
  canSubmitActivityWork,
} from "@/lib/activity-runtime/activity-permissions";
import { normalizeWorkStatus, toRuntimePhase } from "@/lib/activity-runtime/activity-phases";
import { teacherControlLabel } from "@/lib/activity-runtime/activity-commands";
import { normalizeTeacherWhiteboardCommand } from "@/lib/whiteboard/server/normalize-command";

describe("whiteboard lifecycle parity (WB-1)", () => {
  it("aliases shared teacher commands to legacy types", () => {
    expect(normalizeTeacherWhiteboardCommand({ type: "OPEN" })).toEqual({
      type: "OPEN_BOARDS",
    });
    expect(normalizeTeacherWhiteboardCommand({ type: "COLLECT" })).toEqual({
      type: "COLLECT_ALL",
    });
    expect(normalizeTeacherWhiteboardCommand({ type: "COMPLETE" })).toEqual({
      type: "END_ROUND",
    });
    expect(
      normalizeTeacherWhiteboardCommand({
        type: "SHOW",
        boardId: "board:student:u1",
        anonymous: true,
      }),
    ).toEqual({
      type: "DISPLAY_BOARD",
      boardId: "board:student:u1",
      anonymous: true,
      taskKind: undefined,
      prompt: undefined,
    });
    expect(normalizeTeacherWhiteboardCommand({ type: "OPEN_BOARDS" })).toEqual({
      type: "OPEN_BOARDS",
    });
  });

  it("maps shared and legacy labels the same", () => {
    expect(teacherControlLabel("OPEN")).toBe(teacherControlLabel("OPEN_BOARDS"));
    expect(teacherControlLabel("COMPLETE")).toBe(teacherControlLabel("END_ROUND"));
    expect(teacherControlLabel("COLLECT")).toBe(teacherControlLabel("COLLECT_ALL"));
  });

  it("gates edit/submit with shared helpers on OPEN + ACTIVE board", () => {
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
      canEditActivityWork({
        phase: toRuntimePhase("OPEN"),
        workStatus: normalizeWorkStatus("ACTIVE"),
        role: "player",
        isOwner: true,
        hasReviewPush: true,
      }),
    ).toBe(false);
    expect(
      canEditActivityWork({
        phase: toRuntimePhase("ENDED"),
        workStatus: normalizeWorkStatus("SUBMITTED"),
        role: "player",
        isOwner: true,
        hasReviewPush: false,
      }),
    ).toBe(false);
  });
});
