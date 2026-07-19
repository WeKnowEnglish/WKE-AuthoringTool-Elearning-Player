import { describe, expect, it } from "vitest";
import {
  clearLastRoll,
  configureRandomiser,
  createEmptyRandomiser,
  rollDice,
} from "@/lib/virtual-classroom/tools/dice";
import {
  awardPoints,
  createEmptySessionPoints,
  leaderboard,
  resetSessionPoints,
  undoLastAward,
} from "@/lib/virtual-classroom/tools/points";
import {
  clearAllStatuses,
  countByStatus,
  createEmptyClassroomStatus,
  setInteractionFrozen,
  setStudentStatus,
} from "@/lib/virtual-classroom/tools/status";
import {
  addGlobalTime,
  createIdleGlobalTimer,
  elapsedMs,
  pauseGlobalTimer,
  remainingMs,
  resetGlobalTimer,
  resumeGlobalTimer,
  setGlobalTimerMode,
  startGlobalTimer,
} from "@/lib/virtual-classroom/tools/timer";

describe("global timer", () => {
  it("counts down while running", () => {
    let t = createIdleGlobalTimer(10_000);
    t = startGlobalTimer(t, 1_000);
    expect(remainingMs(t, 1_000)).toBe(10_000);
    expect(remainingMs(t, 4_000)).toBe(7_000);
    t = pauseGlobalTimer(t, 4_000);
    expect(remainingMs(t, 9_000)).toBe(7_000);
    t = resumeGlobalTimer(t, 9_000);
    expect(remainingMs(t, 10_000)).toBe(6_000);
  });

  it("stopwatch tracks elapsed", () => {
    let t = setGlobalTimerMode(createIdleGlobalTimer(), "stopwatch");
    t = startGlobalTimer(t, 0);
    expect(elapsedMs(t, 5_000)).toBe(5_000);
    t = pauseGlobalTimer(t, 5_000);
    expect(elapsedMs(t, 20_000)).toBe(5_000);
  });

  it("adds time and resets", () => {
    let t = startGlobalTimer(createIdleGlobalTimer(60_000), 0);
    t = addGlobalTime(t, 30_000);
    expect(t.durationMs).toBe(90_000);
    t = resetGlobalTimer(t, 45_000);
    expect(t.status).toBe("idle");
    expect(t.durationMs).toBe(45_000);
  });
});

describe("dice randomiser", () => {
  it("rolls 2d6 with deterministic random", () => {
    let state = configureRandomiser(createEmptyRandomiser(), { preset: "2d6" });
    let i = 0;
    const seq = [0, 0.99];
    state = rollDice(state, { random: () => seq[i++ % seq.length]!, nowMs: 1 });
    expect(state.lastRoll?.values).toEqual([1, 6]);
    expect(state.lastRoll?.total).toBe(7);
  });

  it("rolls labels and respects lock", () => {
    let state = configureRandomiser(createEmptyRandomiser(), {
      preset: "labels",
      labels: ["A", "B", "C"],
    });
    state = rollDice(state, { random: () => 0.5, nowMs: 2 });
    expect(state.lastRoll?.labels).toEqual(["B"]);
    state = configureRandomiser(state, { locked: true });
    const locked = rollDice(state, { random: () => 0, nowMs: 3 });
    expect(locked.lastRoll?.at).toBe(2);
    state = clearLastRoll(state);
    expect(state.lastRoll).toBeNull();
  });
});

describe("session points", () => {
  it("awards, undoes, and ranks", () => {
    let s = createEmptySessionPoints();
    s = awardPoints(s, { studentId: "a", delta: 2, nowMs: 1 });
    s = awardPoints(s, { studentId: "b", delta: 5, nowMs: 2 });
    s = awardPoints(s, { studentId: "a", delta: 1, nowMs: 3 });
    expect(leaderboard(s).map((r) => r.studentId)).toEqual(["b", "a"]);
    s = undoLastAward(s);
    expect(s.totalsByStudentId.a).toBe(2);
    s = resetSessionPoints(s);
    expect(leaderboard(s)).toEqual([]);
  });

  it("does not go below zero", () => {
    let s = awardPoints(createEmptySessionPoints(), { studentId: "a", delta: 1 });
    s = awardPoints(s, { studentId: "a", delta: -5 });
    expect(s.totalsByStudentId.a).toBe(0);
  });
});

describe("classroom status", () => {
  it("sets, counts, freezes, and clears", () => {
    let s = createEmptyClassroomStatus();
    s = setStudentStatus(s, "u1", "ready");
    s = setStudentStatus(s, "u2", "help");
    expect(countByStatus(s).ready).toBe(1);
    expect(countByStatus(s).help).toBe(1);
    s = setInteractionFrozen(s, true);
    expect(s.interactionFrozen).toBe(true);
    s = clearAllStatuses(s);
    expect(Object.keys(s.byStudentId)).toHaveLength(0);
  });
});
