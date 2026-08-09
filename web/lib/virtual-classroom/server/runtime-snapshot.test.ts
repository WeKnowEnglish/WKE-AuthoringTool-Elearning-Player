import { describe, expect, it } from "vitest";
import {
  createInitialClassroomRuntimeSnapshot,
  mergeLiveblocksRuntimeIntoSnapshot,
} from "@/lib/virtual-classroom/server/runtime-snapshot";

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

  it("mirrors completed Liveblocks control state without storing members", () => {
    const current = createInitialClassroomRuntimeSnapshot({
      sessionId: "session-1",
      actorUserId: "teacher-1",
      now: new Date("2026-08-09T00:00:00.000Z"),
    });
    const next = mergeLiveblocksRuntimeIntoSnapshot({
      current,
      actorUserId: "teacher-2",
      now: new Date("2026-08-09T00:01:00.000Z"),
      runtime: {
        uiMode: "learn",
        learnStage: "activity",
        announcement: "Try question two.",
        activeActivity: { kind: "word_cards", joinCode: "ABC123", label: "Animals" },
        points: { totalsByStudentId: { "student-1": 4 } },
        members: { "student-1": { name: "Mia" } },
      },
    });

    expect(next).toMatchObject({
      uiMode: "learn",
      learnStage: "activity",
      announcement: "Try question two.",
      activeActivity: { kind: "word_cards", joinCode: "ABC123", label: "Animals" },
      updatedBy: "teacher-2",
      tools: { points: { totalsByStudentId: { "student-1": 4 } } },
    });
    expect(next.tools).not.toHaveProperty("members");
  });
});
