import { describe, expect, it } from "vitest";
import { activeClassroomStudentIds } from "@/lib/virtual-classroom/server/participant-registry";

describe("active classroom participant registry", () => {
  it("uses only currently present signed-in students", () => {
    expect(activeClassroomStudentIds([
      { participantKey: "s1", userId: "s1", role: "student", lobbyFirstJoinedAt: new Date().toISOString(), lobbyLastLeftAt: null, lobbyLastSeenAt: new Date().toISOString(), lobbyJoinCount: 1, videoFirstJoinedAt: null, videoLastLeftAt: null, videoTotalSeconds: 0, videoJoinCount: 0, source: "provisional" },
      { participantKey: "s2", userId: "s2", role: "student", lobbyFirstJoinedAt: new Date().toISOString(), lobbyLastLeftAt: new Date().toISOString(), lobbyLastSeenAt: new Date().toISOString(), lobbyJoinCount: 1, videoFirstJoinedAt: null, videoLastLeftAt: null, videoTotalSeconds: 0, videoJoinCount: 0, source: "provisional" },
      { participantKey: "t1", userId: "t1", role: "teacher", lobbyFirstJoinedAt: new Date().toISOString(), lobbyLastLeftAt: null, lobbyLastSeenAt: new Date().toISOString(), lobbyJoinCount: 1, videoFirstJoinedAt: null, videoLastLeftAt: null, videoTotalSeconds: 0, videoJoinCount: 0, source: "provisional" },
    ])).toEqual(["s1"]);
  });

  it("expires a lobby record when its browser heartbeat stops", () => {
    expect(activeClassroomStudentIds([
      { participantKey: "s1", userId: "s1", role: "student", lobbyFirstJoinedAt: "2026-01-01", lobbyLastLeftAt: null, lobbyLastSeenAt: "2026-01-01", lobbyJoinCount: 1, videoFirstJoinedAt: null, videoLastLeftAt: null, videoTotalSeconds: 0, videoJoinCount: 0, source: "provisional" },
    ])).toEqual([]);
  });
});
