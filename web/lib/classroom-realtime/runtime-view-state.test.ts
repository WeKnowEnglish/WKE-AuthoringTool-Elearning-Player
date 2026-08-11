import { describe, expect, it } from "vitest";
import { resolveClassroomRuntimeViewState } from "@/lib/classroom-realtime/runtime-view-state";
import { createInitialClassroomRuntimeSnapshot } from "@/lib/virtual-classroom/server/runtime-snapshot";

describe("Supabase classroom runtime view state", () => {
  it("merges low-latency patches over the durable recovery snapshot", () => {
    const snapshot = createInitialClassroomRuntimeSnapshot({
      sessionId: "session-1",
      actorUserId: "teacher-1",
    });
    const view = resolveClassroomRuntimeViewState({
      snapshot,
      patch: {
        uiMode: "learn",
        announcement: "Page three",
        tools: {
          points: {
            totalsByStudentId: { "student-1": 4 },
            history: [],
            showLeaderboard: true,
          },
        },
      },
    });

    expect(view).toMatchObject({
      uiMode: "learn",
      announcement: "Page three",
      points: { totalsByStudentId: { "student-1": 4 } },
      timer: { status: "idle" },
      activeActivity: { kind: null },
    });
  });

  it("respects explicit nullable control patches", () => {
    const snapshot = {
      ...createInitialClassroomRuntimeSnapshot({
        sessionId: "session-1",
        actorUserId: "teacher-1",
      }),
      announcement: "Old",
      learnActivity: {
        activityId: "quiz-1",
        format: "quiz",
        title: "Quiz",
        playPath: "/play/quiz-1",
      },
    };
    const view = resolveClassroomRuntimeViewState({
      snapshot,
      patch: { announcement: null, learnActivity: null },
    });
    expect(view.announcement).toBeNull();
    expect(view.learnActivity).toBeNull();
  });
});
