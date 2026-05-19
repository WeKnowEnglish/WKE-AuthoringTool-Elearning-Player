import { describe, expect, it } from "vitest";
import { shouldSkipLevelLanding } from "@/lib/landing/should-skip-landing";

describe("shouldSkipLevelLanding", () => {
  it("skips only when authenticated", () => {
    expect(shouldSkipLevelLanding({ isAuthenticated: true })).toBe(true);
    expect(shouldSkipLevelLanding({ isAuthenticated: false })).toBe(false);
  });
});
