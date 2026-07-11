import { describe, expect, it } from "vitest";
import { canAccessLiveGameRoom } from "@/lib/live-game/liveblocks/auth-policy";
import { formatHostCookieValue, hostCookieMatchesSession } from "@/lib/live-game/liveblocks/host-cookie";
import { isValidJoinCode } from "@/lib/live-game/liveblocks/join-code";
import { sessionIdFromRoomId, toRoomId } from "@/lib/live-game/liveblocks/room-id";
import { createMovementState, tickMovement } from "@/lib/live-game/engine/movement";
import {
  LIVE_GAME_DEFAULT_AVATAR_ID,
  resolveLiveGameCharacter,
} from "@/lib/live-game/characters/live-game-characters";
import { ENGLISH_CRAFT_MAP_V1 } from "@/lib/live-game/modes/english-craft/map-v1";
import { getRoomProduct } from "@/lib/liveblocks/room-prefix";

describe("live-game room ids", () => {
  it("round-trips session id through room prefix", () => {
    expect(toRoomId("ABC234")).toBe("wke-live-game-ABC234");
    expect(sessionIdFromRoomId("wke-live-game-ABC234")).toBe("ABC234");
    expect(getRoomProduct("wke-live-game-ABC234")).toBe("live-game");
  });

  it("rejects invalid join codes in room id", () => {
    expect(isValidJoinCode("ABC234")).toBe(true);
    expect(sessionIdFromRoomId("wke-live-game-INVALID")).toBe(null);
  });
});

describe("live-game auth policy", () => {
  it("allows players to join with valid room id", () => {
    expect(
      canAccessLiveGameRoom({
        room: "wke-live-game-ABC234",
        role: "player",
        hostCookie: null,
      }),
    ).toBe(true);
  });

  it("requires host cookie for host role", () => {
    const cookie = formatHostCookieValue("ABC234", "secret");
    expect(
      canAccessLiveGameRoom({
        room: "wke-live-game-ABC234",
        role: "host",
        hostCookie: cookie,
      }),
    ).toBe(true);
    expect(
      canAccessLiveGameRoom({
        room: "wke-live-game-ABC234",
        role: "host",
        hostCookie: null,
      }),
    ).toBe(false);
    expect(hostCookieMatchesSession(cookie, "ABC234")).toBe(true);
  });
});

describe("live-game characters", () => {
  it("resolves known avatar ids and legacy fallbacks", () => {
    expect(resolveLiveGameCharacter("girl-3").id).toBe("girl-3");
    expect(resolveLiveGameCharacter("boy").id).toBe(LIVE_GAME_DEFAULT_AVATAR_ID);
    expect(resolveLiveGameCharacter("unknown").id).toBe(LIVE_GAME_DEFAULT_AVATAR_ID);
  });
});

describe("live-game movement", () => {
  it("creates spawn positions from map", () => {
    const state = createMovementState(ENGLISH_CRAFT_MAP_V1, 0);
    expect(state.x).toBeGreaterThan(0);
    expect(state.y).toBeGreaterThan(0);
  });

  it("moves player when axis input is non-zero", () => {
    const start = createMovementState(ENGLISH_CRAFT_MAP_V1, 0);
    const next = tickMovement(ENGLISH_CRAFT_MAP_V1, start, {
      axisX: 1,
      axisY: 0,
      dtSec: 0.1,
    });
    expect(next.x).toBeGreaterThan(start.x);
  });
});
