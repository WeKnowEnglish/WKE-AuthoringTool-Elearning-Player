import { describe, expect, it } from "vitest";
import { IDLE_LOGOUT_MS, isIdleSessionExpired, remainingIdleSessionMs } from "./idle-session";

describe("idle session timing", () => {
  it("uses a ten-minute timeout", () => {
    expect(IDLE_LOGOUT_MS).toBe(600_000);
  });

  it("expires at the timeout boundary", () => {
    expect(isIdleSessionExpired(1_000, 1_000 + IDLE_LOGOUT_MS - 1)).toBe(false);
    expect(isIdleSessionExpired(1_000, 1_000 + IDLE_LOGOUT_MS)).toBe(true);
  });

  it("never reports negative remaining time", () => {
    expect(remainingIdleSessionMs(0, IDLE_LOGOUT_MS + 1)).toBe(0);
  });
});
