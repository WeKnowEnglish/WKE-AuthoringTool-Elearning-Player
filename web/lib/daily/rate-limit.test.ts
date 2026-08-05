import { describe, expect, it } from "vitest";
import { rateLimitAllowMemory } from "@/lib/rate-limit/memory";
import {
  allowDailyAttendanceRequest,
  allowDailyRoomCreate,
  allowDailyTokenRequest,
} from "@/lib/daily/rate-limit";

describe("daily rate limits", () => {
  it("allows bursts under the token cap then blocks", async () => {
    const keySuffix = `t-${Date.now()}-${Math.random()}`;
    const sessionId = `vcs_${keySuffix}`;
    const userId = `user_${keySuffix}`;
    let allowed = 0;
    for (let i = 0; i < 35; i++) {
      if (await allowDailyTokenRequest(userId, sessionId)) allowed += 1;
    }
    expect(allowed).toBe(30);
    expect(await allowDailyTokenRequest(userId, sessionId)).toBe(false);
  });

  it("scopes attendance and room limits separately", async () => {
    const suffix = `a-${Date.now()}-${Math.random()}`;
    expect(await allowDailyAttendanceRequest(`u-${suffix}`, `s-${suffix}`)).toBe(
      true,
    );
    expect(await allowDailyRoomCreate(`h-${suffix}`, `s-${suffix}`)).toBe(true);
    expect(rateLimitAllowMemory(`probe-${suffix}`, 1, 60_000)).toBe(true);
    expect(rateLimitAllowMemory(`probe-${suffix}`, 1, 60_000)).toBe(false);
  });
});
