import { describe, expect, it } from "vitest";
import {
  createIdleGlobalTimer,
  normalizeGlobalTimerState,
} from "@/lib/classroom-tools/timer";

describe("normalizeGlobalTimerState", () => {
  it("accepts a serialized classroom timer", () => {
    const timer = createIdleGlobalTimer(90_000);
    expect(normalizeGlobalTimerState(timer)).toEqual(timer);
  });

  it("rejects incomplete or invalid realtime state", () => {
    expect(normalizeGlobalTimerState({ mode: "countdown" })).toBeNull();
    expect(normalizeGlobalTimerState({ ...createIdleGlobalTimer(), durationMs: Number.NaN })).toBeNull();
  });
});
