import { describe, expect, it } from "vitest";
import { createInitialClassroomRuntimeSnapshot } from "@/lib/virtual-classroom/server/runtime-snapshot";

describe("initial classroom runtime snapshot", () => {
  it("matches the current Virtual Classroom control-plane defaults", () => {
    const snapshot = createInitialClassroomRuntimeSnapshot({
      sessionId: "session-1",
      actorUserId: "teacher-1",
      now: new Date("2026-08-09T00:00:00.000Z"),
    });

    expect(snapshot).toMatchObject({
      sessionId: "session-1",
      stateVersion: 1,
      status: "active",
      uiMode: "meeting",
      learnStage: "whiteboard",
      learnStudentPensEnabled: true,
      updatedBy: "teacher-1",
    });
    expect(snapshot.tools).toMatchObject({
      picker: { availableStudentIds: [], currentStudentIds: [] },
      groupSet: { groups: [] },
      points: { totalsByStudentId: {} },
      classroomStatus: { interactionFrozen: false },
    });
  });
});
