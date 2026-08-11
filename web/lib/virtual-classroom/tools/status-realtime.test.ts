import { describe, expect, it } from "vitest";
import {
  createEmptyClassroomStatus,
  normalizeClassroomStatusState,
  setInteractionFrozen,
  setStudentStatus,
} from "@/lib/virtual-classroom/tools/status";

describe("normalizeClassroomStatusState", () => {
  it("accepts student signals and teacher freeze state", () => {
    const state = setInteractionFrozen(
      setStudentStatus(createEmptyClassroomStatus(), "student-1", "hand"),
      true,
    );
    expect(normalizeClassroomStatusState(state)).toEqual(state);
  });

  it("rejects unknown status values", () => {
    expect(normalizeClassroomStatusState({ byStudentId: { s1: "confused" }, interactionFrozen: false })).toBeNull();
  });
});
