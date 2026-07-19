import { describe, expect, it } from "vitest";
import { WORKSHEET_PRESETS } from "@/lib/whiteboard/domain";
import {
  normalizeWhiteboardLaunchPayload,
  whiteboardLaunchStartLabel,
  WHITEBOARD_LAUNCH_MODE_OPTIONS,
} from "@/lib/whiteboard/launch-options";

describe("whiteboard VC launch panel (WB-5)", () => {
  it("exposes individual, group, and teacher_demo modes", () => {
    expect(WHITEBOARD_LAUNCH_MODE_OPTIONS.map((o) => o.value)).toEqual([
      "individual",
      "group",
      "teacher_demo",
    ]);
    expect(whiteboardLaunchStartLabel("group")).toBe("Start group whiteboard");
    expect(whiteboardLaunchStartLabel("teacher_demo")).toBe("Start teacher demo");
  });

  it("normalizes defaults for a thin launch payload", () => {
    const payload = normalizeWhiteboardLaunchPayload({});
    expect(payload.mode).toBe("individual");
    expect(payload.timerMinutes).toBe(4);
    expect(payload.worksheetPresetId).toBe(WORKSHEET_PRESETS[0]?.id ?? null);
    expect(payload.title).toBe("Whiteboard activity");
    expect(payload.instructions.length).toBeGreaterThan(0);
  });

  it("accepts blank worksheet and clamps timer", () => {
    expect(
      normalizeWhiteboardLaunchPayload({
        mode: "group",
        worksheetPresetId: null,
        timerMinutes: 0,
        title: "  Draw the room  ",
        instructions: "  Label the furniture.  ",
      }),
    ).toEqual({
      mode: "group",
      worksheetPresetId: null,
      timerMinutes: 1,
      title: "Draw the room",
      instructions: "Label the furniture.",
    });

    expect(
      normalizeWhiteboardLaunchPayload({
        worksheetPresetId: "not-a-real-preset",
        timerMinutes: 99,
      }).worksheetPresetId,
    ).toBe(WORKSHEET_PRESETS[0]?.id ?? null);

    expect(
      normalizeWhiteboardLaunchPayload({ timerMinutes: 99 }).timerMinutes,
    ).toBe(30);
  });
});
