import { describe, expect, it } from "vitest";
import { normalizeTeacherWhiteboardCommand } from "@/lib/whiteboard/server/normalize-command";

describe("whiteboard review commands (WB-2)", () => {
  it("accepts REVEAL_RESULTS and CLEAR_SHOW aliases", () => {
    expect(normalizeTeacherWhiteboardCommand({ type: "REVEAL_RESULTS" })).toEqual({
      type: "REVEAL_RESULTS",
    });
    expect(normalizeTeacherWhiteboardCommand({ type: "CLEAR_SHOW" })).toEqual({
      type: "CLEAR_DISPLAY",
    });
  });
});
