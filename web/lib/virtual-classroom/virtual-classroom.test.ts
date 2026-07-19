import { describe, expect, it } from "vitest";
import {
  classSessionIdFromJoinCode,
  joinCodeFromVirtualClassroomRoom,
  toVirtualClassroomRoomId,
} from "@/lib/virtual-classroom/room-id";
import {
  decodeVcMemberToken,
  encodeVcMemberToken,
  formatVcHostCookie,
  vcHostMatchesJoinCode,
} from "@/lib/virtual-classroom/session-cookie";
import { canAccessVirtualClassroomRoom } from "@/lib/virtual-classroom/auth-policy";
import { getRoomProduct } from "@/lib/liveblocks/room-prefix";

describe("virtual classroom room ids", () => {
  it("builds and parses session rooms", () => {
    expect(toVirtualClassroomRoomId("AB34CD")).toBe("wke-vc-session-AB34CD");
    expect(joinCodeFromVirtualClassroomRoom("wke-vc-session-AB34CD")).toBe("AB34CD");
    expect(classSessionIdFromJoinCode("AB34CD")).toBe("vcs_AB34CD");
  });

  it("classifies product before whiteboard", () => {
    expect(getRoomProduct("wke-vc-session-AB34CD")).toBe("virtual-classroom");
    expect(getRoomProduct("wke-whiteboard-AB34CD")).toBe("whiteboard");
  });
});

describe("virtual classroom cookies", () => {
  it("round-trips member token and host cookie", () => {
    const token = encodeVcMemberToken({
      sessionId: "vcs_AB34CD",
      joinCode: "AB34CD",
      roomId: "wke-vc-session-AB34CD",
      userId: "u1",
      displayName: "Sam",
      role: "member",
    });
    expect(decodeVcMemberToken(token)?.userId).toBe("u1");
    expect(vcHostMatchesJoinCode(formatVcHostCookie("AB34CD", "secret"), "AB34CD")).toBe(true);
  });

  it("allows guest-style member tokens for one-off stress sessions", () => {
    const token = encodeVcMemberToken({
      sessionId: "vcs_XY12ZZ",
      joinCode: "XY12ZZ",
      roomId: "wke-vc-session-XY12ZZ",
      userId: "guest-abc",
      displayName: "Guest Sam",
      role: "member",
    });
    expect(decodeVcMemberToken(token)?.displayName).toBe("Guest Sam");
  });

  it("authorizes member cookie for session room", () => {
    const token = encodeVcMemberToken({
      sessionId: "vcs_AB34CD",
      joinCode: "AB34CD",
      roomId: "wke-vc-session-AB34CD",
      userId: "u1",
      displayName: "Sam",
      role: "member",
    });
    expect(
      canAccessVirtualClassroomRoom({
        room: "wke-vc-session-AB34CD",
        role: "player",
        hostCookie: null,
        memberCookie: token,
      }),
    ).toBe(true);
  });
});
