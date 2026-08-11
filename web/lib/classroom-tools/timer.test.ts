import { describe, expect, it } from "vitest";
import {
  createIdleGlobalTimer,
  normalizeGlobalTimerState,
  resolveTimerActionTime,
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

describe("resolveTimerActionTime", () => {
  it("uses a recent teacher click time", () => {
    expect(resolveTimerActionTime(9_500, 10_000)).toBe(9_500);
  });

  it("rejects stale client timestamps", () => {
    expect(resolveTimerActionTime(1_000, 100_000)).toBe(100_000);
  });
});
