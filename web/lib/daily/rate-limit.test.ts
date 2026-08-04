import { describe, expect, it } from "vitest";
import { rateLimitAllow } from "@/lib/rate-limit/memory";
import {
  allowDailyAttendanceRequest,
  allowDailyRoomCreate,
  allowDailyTokenRequest,
} from "@/lib/daily/rate-limit";

describe("daily rate limits", () => {
  it("allows bursts under the token cap then blocks", () => {
    const keySuffix = `t-${Date.now()}-${Math.random()}`;
    const sessionId = `vcs_${keySuffix}`;
    const userId = `user_${keySuffix}`;
    let allowed = 0;
    for (let i = 0; i < 35; i++) {
      if (allowDailyTokenRequest(userId, sessionId)) allowed += 1;
    }
    expect(allowed).toBe(30);
    expect(allowDailyTokenRequest(userId, sessionId)).toBe(false);
  });

  it("scopes attendance and room limits separately", () => {
    const suffix = `a-${Date.now()}-${Math.random()}`;
    expect(allowDailyAttendanceRequest(`u-${suffix}`, `s-${suffix}`)).toBe(true);
    expect(allowDailyRoomCreate(`h-${suffix}`, `s-${suffix}`)).toBe(true);
    // Sanity: underlying helper still works
    expect(rateLimitAllow(`probe-${suffix}`, 1, 60_000)).toBe(true);
    expect(rateLimitAllow(`probe-${suffix}`, 1, 60_000)).toBe(false);
  });
});
