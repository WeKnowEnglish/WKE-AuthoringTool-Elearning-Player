import { describe, expect, it } from "vitest";
import {
  createInitialClassroomRuntimeSnapshot,
  findClassroomRuntimeSnapshotDrift,
  mergeLiveblocksRuntimeIntoSnapshot,
  projectClassroomRuntimeCommand,
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
      learnActivity: null,
      learnPresentation: null,
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
        learnActivity: {
          activityId: "animals-1",
          format: "quiz",
          title: "Animal quiz",
          playPath: "/play/animals-1",
        },
        learnPresentation: {
          kind: "pdf",
          url: "https://cdn.example.com/unit-1.pdf",
          title: "Unit 1",
        },
        announcement: "Try question two.",
        activeActivity: { kind: "word_cards", joinCode: "ABC123", label: "Animals" },
        points: { totalsByStudentId: { "student-1": 4 } },
        members: { "student-1": { name: "Mia" } },
      },
    });

    expect(next).toMatchObject({
      uiMode: "learn",
      learnStage: "activity",
      learnActivity: { activityId: "animals-1", playPath: "/play/animals-1" },
      learnPresentation: { kind: "pdf", title: "Unit 1" },
      announcement: "Try question two.",
      activeActivity: { kind: "word_cards", joinCode: "ABC123", label: "Animals" },
      updatedBy: "teacher-2",
      tools: { points: { totalsByStudentId: { "student-1": 4 } } },
    });
    expect(next.tools).not.toHaveProperty("members");
  });

  it("detects only durable control-plane drift", () => {
    const snapshot = createInitialClassroomRuntimeSnapshot({
      sessionId: "session-1",
      actorUserId: "teacher-1",
      now: new Date("2026-08-09T00:00:00.000Z"),
    });

    expect(findClassroomRuntimeSnapshotDrift({
      snapshot,
      runtime: { uiMode: "learn", members: { "student-1": { name: "Mia" } } },
    })).toEqual(["uiMode"]);
  });

  it("projects shared navigation commands without a transport dependency", () => {
    const current = createInitialClassroomRuntimeSnapshot({
      sessionId: "session-1",
      actorUserId: "teacher-1",
      now: new Date("2026-08-09T00:00:00.000Z"),
    });
    const projected = projectClassroomRuntimeCommand({
      current,
      actorUserId: "teacher-2",
      now: new Date("2026-08-09T00:01:00.000Z"),
      command: {
        type: "SET_LEARN_ACTIVITY",
        activity: {
          activityId: " animals-1 ",
          format: "quiz",
          title: "Animal quiz",
          playPath: " /play/animals-1 ",
        },
      },
    });

    expect(projected).toMatchObject({
      patch: {
        learnStage: "activity",
        learnActivity: { activityId: "animals-1", playPath: "/play/animals-1" },
      },
      changed: ["learnActivity", "learnStage"],
      snapshot: { updatedBy: "teacher-2", learnStage: "activity" },
    });
  });

  it("does not claim unsupported collaborative commands", () => {
    const current = createInitialClassroomRuntimeSnapshot({
      sessionId: "session-1",
      actorUserId: "teacher-1",
    });
    expect(projectClassroomRuntimeCommand({
      current,
      actorUserId: "teacher-1",
      command: { type: "SEND_GROUPS_TO_WHITEBOARD" },
    })).toBeNull();
  });

  it("projects timer state with a stable authoritative timestamp", () => {
    const current = createInitialClassroomRuntimeSnapshot({
      sessionId: "session-1",
      actorUserId: "teacher-1",
    });
    const projected = projectClassroomRuntimeCommand({
      current,
      actorUserId: "teacher-1",
      now: new Date("2026-08-10T01:02:03.000Z"),
      command: { type: "START_TIMER", durationMs: 90_000 },
    });

    expect(projected).toMatchObject({
      changed: ["tools"],
      patch: {
        tools: {
          timer: {
            status: "running",
            durationMs: 90_000,
            startedAt: Date.parse("2026-08-10T01:02:03.000Z"),
          },
        },
      },
    });
    expect(projected?.snapshot.tools.timer).toEqual(projected?.patch.tools?.timer);
  });

  it("uses the durable participant roster for picker and groups", () => {
    const current = createInitialClassroomRuntimeSnapshot({
      sessionId: "session-1",
      actorUserId: "teacher-1",
    });
    const picker = projectClassroomRuntimeCommand({
      current,
      actorUserId: "teacher-1",
      activeStudentIds: ["student-1", "student-2"],
      command: { type: "SYNC_ROSTER" },
    });
    const groups = projectClassroomRuntimeCommand({
      current,
      actorUserId: "teacher-1",
      activeStudentIds: ["student-1", "student-2"],
      command: { type: "GENERATE_GROUPS", sizeMode: "pairs" },
    });

    expect(picker?.patch.tools?.picker).toMatchObject({
      availableStudentIds: ["student-1", "student-2"],
    });
    expect(groups?.patch.tools?.groupSet).toMatchObject({
      groups: [{ memberIds: expect.arrayContaining(["student-1", "student-2"]) }],
    });
  });

  it("enforces student identity before projecting own status", () => {
    const current = createInitialClassroomRuntimeSnapshot({
      sessionId: "session-1",
      actorUserId: "teacher-1",
    });
    expect(() => projectClassroomRuntimeCommand({
      current,
      actorUserId: "student-1",
      command: { type: "SET_OWN_STATUS", studentId: "student-2", status: "help" },
    })).toThrow("You can only set your own status.");
  });
});
