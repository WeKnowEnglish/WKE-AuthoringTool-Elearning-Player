import { describe, expect, it } from "vitest";
import {
  computeSessionRemainingMs,
  detectSessionTimerFlashCrossing,
  extendSessionDeadline,
  formatSessionTimeRemaining,
  getFinalCountdownDigit,
  getSessionRemainingSecondsCeil,
  getSessionRemainingSecondsFloor,
  getSessionTimerAlertPhase,
  isUnlimitedSessionTimer,
} from "@/lib/live-game/session-timer";

describe("session timer helpers", () => {
  it("treats null endsAt as unlimited", () => {
    expect(isUnlimitedSessionTimer(null)).toBe(true);
    expect(computeSessionRemainingMs(null, Date.now())).toBeNull();
  });

  it("clamps remaining ms at zero", () => {
    expect(computeSessionRemainingMs(1000, 2500)).toBe(0);
    expect(computeSessionRemainingMs(5000, 1000)).toBe(4000);
  });

  it("adds one minute from the later of the deadline or server time", () => {
    expect(extendSessionDeadline(120_000, 100_000)).toBe(180_000);
    expect(extendSessionDeadline(90_000, 100_000)).toBe(160_000);
  });

  it("formats mm:ss with ceil seconds", () => {
    expect(formatSessionTimeRemaining(61_000)).toBe("1:01");
    expect(formatSessionTimeRemaining(60_500)).toBe("1:01");
    expect(formatSessionTimeRemaining(59_100)).toBe("1:00");
    expect(formatSessionTimeRemaining(0)).toBe("0:00");
  });

  it("derives floor and ceil seconds", () => {
    expect(getSessionRemainingSecondsFloor(59_100)).toBe(59);
    expect(getSessionRemainingSecondsCeil(59_100)).toBe(60);
  });

  it("maps alert phases from floor seconds", () => {
    expect(getSessionTimerAlertPhase(121)).toBe("none");
    expect(getSessionTimerAlertPhase(120)).toBe("two_min");
    expect(getSessionTimerAlertPhase(31)).toBe("two_min");
    expect(getSessionTimerAlertPhase(30)).toBe("thirty_sec");
    expect(getSessionTimerAlertPhase(6)).toBe("thirty_sec");
    expect(getSessionTimerAlertPhase(5)).toBe("final_five");
    expect(getSessionTimerAlertPhase(1)).toBe("final_five");
    expect(getSessionTimerAlertPhase(0)).toBe("none");
  });

  it("returns final countdown digits only in the last five seconds", () => {
    expect(getFinalCountdownDigit(5_500)).toBeNull();
    expect(getFinalCountdownDigit(5_000)).toBe(5);
    expect(getFinalCountdownDigit(1_100)).toBe(2);
    expect(getFinalCountdownDigit(900)).toBe(1);
    expect(getFinalCountdownDigit(0)).toBeNull();
  });

  it("detects one-time flash crossings", () => {
    expect(detectSessionTimerFlashCrossing(121, 120)).toBe("two_min");
    expect(detectSessionTimerFlashCrossing(120, 119)).toBeNull();
    expect(detectSessionTimerFlashCrossing(31, 30)).toBe("thirty_sec");
    expect(detectSessionTimerFlashCrossing(30, 29)).toBeNull();
    expect(detectSessionTimerFlashCrossing(null, 120)).toBeNull();
  });
});
