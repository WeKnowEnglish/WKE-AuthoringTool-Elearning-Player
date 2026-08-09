import { describe, expect, it } from "vitest";
import { shouldApplyRealtimeEvent, snapshotEvent } from "@/lib/classroom-realtime/events";
import type { ClassroomRuntimeSnapshot } from "@/lib/classroom-realtime/types";

const snapshot: ClassroomRuntimeSnapshot = {
  sessionId: "session-1",
  stateVersion: 4,
  status: "active",
  uiMode: "learn",
  learnStage: "activity",
  announcement: null,
  activeActivity: { kind: null, joinCode: null, label: null, roundId: null, roomId: null },
  tools: {},
  updatedAt: "2026-08-09T00:00:00.000Z",
  updatedBy: "teacher-1",
};

describe("classroom realtime event contract", () => {
  it("creates a versioned runtime event", () => {
    expect(snapshotEvent(snapshot, ["uiMode"]))
      .toMatchObject({ type: "runtime:updated", sessionId: "session-1", stateVersion: 4, changed: ["uiMode"] });
  });

  it("does not apply stale durable events", () => {
    expect(shouldApplyRealtimeEvent({ type: "runtime:updated", sessionId: "session-1", stateVersion: 4, changed: [], sentAt: 1 }, 4)).toBe(false);
    expect(shouldApplyRealtimeEvent({ type: "runtime:updated", sessionId: "session-1", stateVersion: 5, changed: [], sentAt: 1 }, 4)).toBe(true);
  });

  it("always permits transient presence events", () => {
    expect(shouldApplyRealtimeEvent({ type: "presence:hand", sessionId: "session-1", userId: "student-1", raised: true, sentAt: 1 }, 4)).toBe(true);
  });
});
