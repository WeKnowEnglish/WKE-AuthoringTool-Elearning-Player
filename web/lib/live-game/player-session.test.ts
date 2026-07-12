import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createLiveGamePlayerToken,
  verifyLiveGamePlayerToken,
  canRecordLiveGameMastery,
} from "@/lib/live-game/server/player-session";

describe("live-game signed player session", () => {
  const priorSecret = process.env.LIVEBLOCKS_SECRET_KEY;

  beforeEach(() => {
    process.env.LIVEBLOCKS_SECRET_KEY = "test-liveblocks-secret";
  });

  afterEach(() => {
    process.env.LIVEBLOCKS_SECRET_KEY = priorSecret;
  });

  it("round-trips signed room identity", () => {
    const token = createLiveGamePlayerToken({
      roomId: "wke-live-game-ABC234",
      playerId: "student-1",
      role: "player",
      displayName: "Sam",
      accountType: "authenticated",
      accountUserId: "student-1",
    });
    expect(verifyLiveGamePlayerToken(token)).toMatchObject({
      roomId: "wke-live-game-ABC234",
      playerId: "student-1",
      role: "player",
    });
  });

  it("rejects a modified identity payload", () => {
    const token = createLiveGamePlayerToken({
      roomId: "wke-live-game-ABC234",
      playerId: "student-1",
      role: "player",
      displayName: "Sam",
      accountType: "authenticated",
      accountUserId: "student-1",
    });
    const [payload, signature] = token.split(".");
    expect(verifyLiveGamePlayerToken(`${payload}x.${signature}`)).toBeNull();
  });

  it("never permits guest mastery persistence", () => {
    const token = createLiveGamePlayerToken({
      roomId: "wke-live-game-ABC234",
      playerId: "guest-1",
      role: "player",
      displayName: "Guest",
      accountType: "guest",
      accountUserId: null,
    });
    const session = verifyLiveGamePlayerToken(token);
    expect(session).not.toBeNull();
    expect(canRecordLiveGameMastery(session!)).toBe(false);
  });
});
