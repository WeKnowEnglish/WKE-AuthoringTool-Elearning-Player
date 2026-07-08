import { describe, expect, it } from "vitest";
import { canAccessRoom } from "@/lib/board-game/liveblocks/auth-policy";
import { formatHostCookieValue } from "@/lib/board-game/liveblocks/host-cookie";
import { toRoomId } from "@/lib/board-game/liveblocks/room-id";

describe("auth-policy", () => {
  const sessionId = "ABCDEF";
  const room = toRoomId(sessionId);
  const hostCookie = formatHostCookieValue(sessionId, "secret-token");

  it("allows players into valid rooms", () => {
    expect(
      canAccessRoom({
        room,
        role: "player",
        hostCookie: null,
      }),
    ).toBe(true);
  });

  it("allows host with matching cookie", () => {
    expect(
      canAccessRoom({
        room,
        role: "host",
        hostCookie,
      }),
    ).toBe(true);
  });

  it("rejects host without cookie", () => {
    expect(
      canAccessRoom({
        room,
        role: "host",
        hostCookie: null,
      }),
    ).toBe(false);
  });

  it("rejects invalid room ids", () => {
    expect(
      canAccessRoom({
        room: "not-a-room",
        role: "player",
        hostCookie: null,
      }),
    ).toBe(false);
  });
});
