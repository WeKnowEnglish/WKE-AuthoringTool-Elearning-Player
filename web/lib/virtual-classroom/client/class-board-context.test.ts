import { describe, expect, it } from "vitest";
import { isCurrentClassBoardContext } from "./class-board-context";
import type { WhiteboardSessionContext } from "@/lib/whiteboard/liveblocks/identity";

const context: WhiteboardSessionContext = { sessionId: "ABCDEF", roomId: "wke-whiteboard-ABCDEF", role: "player", userId: "student-a", displayName: "Student", color: "#000" };
describe("class board context reuse", () => {
  it("restores the current participant's current board", () => {
    expect(isCurrentClassBoardContext(context, "ABCDEF", "student-a", "member")).toBe(true);
  });
  it("rejects a previous class board, signed-out account, or host context", () => {
    expect(isCurrentClassBoardContext(context, "GHIJKL", "student-a", "member")).toBe(false);
    expect(isCurrentClassBoardContext(context, "ABCDEF", "student-b", "member")).toBe(false);
    expect(isCurrentClassBoardContext(context, "ABCDEF", "student-a", "host")).toBe(false);
    expect(isCurrentClassBoardContext(context, null, "student-a", "member")).toBe(false);
    expect(isCurrentClassBoardContext(null, "ABCDEF", "student-a", "member")).toBe(false);
  });
});
