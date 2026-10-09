import { describe, expect, it } from "vitest";
import { canRecoverDailyFatalError, canRetryDailyRequest, dailyResumeKey, parseDailyResume } from "./recovery";

describe("video recovery boundaries", () => {
  it("keeps recovery scoped to both lesson and account", () => {
    expect(dailyResumeKey("class-a", "student-a")).not.toBe(dailyResumeKey("class-a", "student-b"));
    expect(dailyResumeKey("class-a", "student-a")).not.toBe(dailyResumeKey("class-b", "student-a"));
  });
  it("restores mute preferences only from a recent successful join", () => {
    const resume = { joinedAt: 1000, audioOff: true, videoOff: false };
    expect(parseDailyResume(JSON.stringify(resume), 2000)).toEqual(resume);
    expect(parseDailyResume(JSON.stringify(resume), 1000 + 8 * 60 * 60 * 1000)).toBeNull();
    expect(parseDailyResume(JSON.stringify(resume), 999)).toBeNull();
    expect(parseDailyResume('{"joinedAt":1000}', 2000)).toBeNull();
    expect(parseDailyResume("broken", 2000)).toBeNull();
  });
  it.each([0, 408, 429, 500, 502, 503])("backs off transient request failure %s", status => {
    expect(canRetryDailyRequest(status)).toBe(true);
  });
  it.each([[403, "not_authorized"], [410, "session_ended"], [503, "daily_disabled"], [404, undefined]])("stops on permanent failure %s/%s", (status, code) => {
    expect(canRetryDailyRequest(status as number, code as string | undefined)).toBe(false);
  });
  it("waits for a teacher's missing room but never reverses removal or expiry", () => {
    expect(canRetryDailyRequest(404, "room_missing")).toBe(true);
    expect(canRecoverDailyFatalError("connection-error")).toBe(true);
    expect(canRecoverDailyFatalError("exp-token")).toBe(true);
    for (const type of ["ejected", "exp-room", "not-allowed", undefined]) expect(canRecoverDailyFatalError(type)).toBe(false);
  });
});
