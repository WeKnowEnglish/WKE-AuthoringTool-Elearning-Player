import { describe, expect, it } from "vitest";
import {
  boardIdForScope,
  createIdleTimer,
  submissionIdempotencyKey,
} from "@/lib/collaborative-activity/domain";
import { assertTransition, canTransition } from "@/lib/collaborative-activity/state-machine";
import { canEditBoard, canSubmitBoard } from "@/lib/collaborative-activity/permissions";
import { listEnabledActivities } from "@/lib/collaborative-activity/registry";
import { remainingMs, startTimer } from "@/lib/collaborative-activity/timer";
import {
  assembleSentence,
  createDefaultPrompt,
  shuffleTileOrder,
} from "@/lib/sentence-strip/domain";
import {
  sessionIdFromWhiteboardRoom,
  toWhiteboardRoomId,
} from "@/lib/whiteboard/liveblocks/room-id";
import { canAccessWhiteboardRoom } from "@/lib/whiteboard/liveblocks/auth-policy";
import { encodeWhiteboardPlayerToken } from "@/lib/whiteboard/liveblocks/host-cookie";

describe("collaborative activity contract", () => {
  it("shares phase transitions", () => {
    expect(canTransition("WAITING", "OPEN")).toBe(true);
    expect(() => assertTransition("ENDED", "OPEN")).toThrow();
  });

  it("builds board ids and submission keys", () => {
    expect(boardIdForScope({ type: "student", studentId: "s1" })).toBe("board:student:s1");
    expect(submissionIdempotencyKey("r1", "b1", 2)).toBe("r1:b1:2");
  });

  it("gates editing by phase and timer", () => {
    const timer = startTimer(createIdleTimer(60_000), 60_000, 1_000);
    expect(
      canEditBoard({
        phase: "OPEN",
        boardStatus: "ACTIVE",
        timer,
        nowMs: 1_000,
        userId: "s1",
        role: "player",
        boardOwnerType: "student",
        boardOwnerId: "s1",
      }),
    ).toBe(true);
    expect(
      canSubmitBoard({
        phase: "OPEN",
        boardStatus: "ACTIVE",
        allowEarlySubmit: true,
        userCanEdit: true,
      }),
    ).toBe(true);
    expect(remainingMs(timer, 1_000)).toBe(60_000);
  });

  it("lists enabled activities including sentence strip", () => {
    const kinds = listEnabledActivities().map((a) => a.kind);
    expect(kinds).toContain("whiteboard");
    expect(kinds).toContain("sentence_strip");
  });
});

describe("sentence strip domain", () => {
  it("assembles ordered tiles", () => {
    const prompt = createDefaultPrompt();
    const sentence = assembleSentence(prompt.tiles, prompt.tiles.map((t) => t.id));
    expect(sentence).toBe("The cat is on the mat");
  });

  it("shuffles without dropping tiles", () => {
    const prompt = createDefaultPrompt();
    const shuffled = shuffleTileOrder(prompt.tiles);
    expect(shuffled.sort()).toEqual(prompt.tiles.map((t) => t.id).sort());
  });
});

describe("whiteboard multi-room auth", () => {
  it("parses session id from control and board rooms", () => {
    expect(sessionIdFromWhiteboardRoom(toWhiteboardRoomId("AB34CD"))).toBe("AB34CD");
    expect(sessionIdFromWhiteboardRoom("wke-whiteboard-ctrl-AB34CD-round1")).toBe("AB34CD");
    expect(sessionIdFromWhiteboardRoom("wke-whiteboard-board-AB34CD-s-student1")).toBe("AB34CD");
  });

  it("fans out player cookie across session rooms", () => {
    const token = encodeWhiteboardPlayerToken({
      roomId: "wke-whiteboard-AB34CD",
      sessionId: "AB34CD",
      userId: "u1",
      displayName: "Sam",
      role: "player",
    });
    expect(
      canAccessWhiteboardRoom({
        room: "wke-whiteboard-board-AB34CD-s-abc",
        role: "player",
        hostCookie: null,
        playerCookie: token,
      }),
    ).toBe(true);
  });
});
