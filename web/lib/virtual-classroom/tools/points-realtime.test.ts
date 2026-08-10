import { describe, expect, it } from "vitest";
import {
  awardPoints,
  createEmptySessionPoints,
  normalizeSessionPointsState,
} from "@/lib/virtual-classroom/tools/points";

describe("normalizeSessionPointsState", () => {
  it("accepts serialized session awards", () => {
    const state = awardPoints(createEmptySessionPoints(), {
      studentId: "student-1",
      delta: 1,
      label: "participation",
      nowMs: 10,
    });
    expect(normalizeSessionPointsState(state)).toEqual(state);
  });

  it("rejects malformed totals and award history", () => {
    expect(normalizeSessionPointsState({ totalsByStudentId: { a: -1 }, history: [], showLeaderboard: true })).toBeNull();
    expect(normalizeSessionPointsState({ ...createEmptySessionPoints(), history: [{ at: 1 }] })).toBeNull();
  });
});
