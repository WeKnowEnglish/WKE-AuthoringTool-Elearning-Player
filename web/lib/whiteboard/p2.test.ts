import { describe, expect, it } from "vitest";
import { canGroupMemberSubmit } from "@/lib/whiteboard/group-policy";
import {
  getWhiteboardRoomStrategy,
  workspaceRoomId,
} from "@/lib/whiteboard/rooms/strategy";

describe("group submit policy", () => {
  const members = ["a", "b", "c"];

  it("any_member allows all", () => {
    expect(
      canGroupMemberSubmit({
        policy: "any_member",
        userId: "b",
        leaderId: "a",
        memberIds: members,
        readyMemberIds: [],
      }),
    ).toBe(true);
  });

  it("leader_only blocks non-leaders", () => {
    expect(
      canGroupMemberSubmit({
        policy: "leader_only",
        userId: "b",
        leaderId: "a",
        memberIds: members,
        readyMemberIds: members,
      }),
    ).toBe(false);
    expect(
      canGroupMemberSubmit({
        policy: "leader_only",
        userId: "a",
        leaderId: "a",
        memberIds: members,
        readyMemberIds: members,
      }),
    ).toBe(true);
  });

  it("everyone_ready requires all ready", () => {
    expect(
      canGroupMemberSubmit({
        policy: "everyone_ready",
        userId: "a",
        leaderId: "a",
        memberIds: members,
        readyMemberIds: ["a", "b"],
      }),
    ).toBe(false);
    expect(
      canGroupMemberSubmit({
        policy: "everyone_ready",
        userId: "a",
        leaderId: "a",
        memberIds: members,
        readyMemberIds: members,
      }),
    ).toBe(true);
  });
});

describe("room strategy", () => {
  it("defaults to single room", () => {
    expect(getWhiteboardRoomStrategy()).toBe("single_room");
    expect(
      workspaceRoomId({
        strategy: "single_room",
        singleRoomId: "wke-whiteboard-ABC123",
        sessionId: "ABC123",
        roundId: "round_1",
        scope: { type: "student", studentId: "s1" },
      }),
    ).toBe("wke-whiteboard-ABC123");
  });

  it("builds per-board room ids when flagged", () => {
    const id = workspaceRoomId({
      strategy: "per_board_rooms",
      singleRoomId: "wke-whiteboard-ABC123",
      sessionId: "ABC123",
      roundId: "round_xyz",
      scope: { type: "student", studentId: "student-uuid-1" },
    });
    expect(id).toContain("wke-whiteboard-board-");
    expect(id).toContain("ABC123");
  });
});
