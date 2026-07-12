import { describe, expect, it } from "vitest";
import { getLiveGameCapacity, LIVE_GAME_MAX_HOSTS, LIVE_GAME_MAX_STUDENTS } from "@/lib/live-game/limits";
import type { LiveGameLobbyPlayer } from "@/lib/live-game/liveblocks/config";

function player(role: LiveGameLobbyPlayer["role"]): LiveGameLobbyPlayer {
  return { name: role, color: "#64748b", role, isReady: role === "host", joinedAt: 1, avatarId: "boy-1" };
}

function room(studentCount: number) {
  return Object.fromEntries([
    ["host", player("host")],
    ...Array.from({ length: studentCount }, (_, index) => [`student-${index + 1}`, player("player")]),
  ]);
}

describe("live-game starter capacity", () => {
  it("allows exactly one host and five students", () => {
    expect(LIVE_GAME_MAX_HOSTS).toBe(1);
    expect(LIVE_GAME_MAX_STUDENTS).toBe(5);
    expect(getLiveGameCapacity(room(4), "student-5").canJoinAsStudent).toBe(true);
    expect(getLiveGameCapacity(room(5), "student-6").canJoinAsStudent).toBe(false);
  });

  it("allows an existing student to rejoin a full room", () => {
    const capacity = getLiveGameCapacity(room(5), "student-3");
    expect(capacity.isRejoin).toBe(true);
    expect(capacity.canJoinAsStudent).toBe(true);
    expect(capacity.studentCount).toBe(5);
  });

  it("rejects joining a room without exactly one host", () => {
    expect(getLiveGameCapacity({}, "student-1").canJoinAsStudent).toBe(false);
    expect(getLiveGameCapacity({ host1: player("host"), host2: player("host") }, "student-1").canJoinAsStudent).toBe(false);
  });
});
