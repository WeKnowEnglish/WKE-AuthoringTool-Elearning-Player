import { afterEach, describe, expect, it, vi } from "vitest";
import { isStoryUnifiedDispatchEnabled } from "./feature-flags";

describe("isStoryUnifiedDispatchEnabled", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is false when unset", () => {
    vi.stubEnv("NEXT_PUBLIC_STORY_UNIFIED_DISPATCH", "");
    expect(isStoryUnifiedDispatchEnabled()).toBe(false);
  });

  it("is true for 1, true, yes (case-insensitive)", () => {
    vi.stubEnv("NEXT_PUBLIC_STORY_UNIFIED_DISPATCH", "1");
    expect(isStoryUnifiedDispatchEnabled()).toBe(true);
    vi.stubEnv("NEXT_PUBLIC_STORY_UNIFIED_DISPATCH", "TRUE");
    expect(isStoryUnifiedDispatchEnabled()).toBe(true);
    vi.stubEnv("NEXT_PUBLIC_STORY_UNIFIED_DISPATCH", " yes ");
    expect(isStoryUnifiedDispatchEnabled()).toBe(true);
  });

  it("is false for 0, false, random", () => {
    vi.stubEnv("NEXT_PUBLIC_STORY_UNIFIED_DISPATCH", "0");
    expect(isStoryUnifiedDispatchEnabled()).toBe(false);
    vi.stubEnv("NEXT_PUBLIC_STORY_UNIFIED_DISPATCH", "false");
    expect(isStoryUnifiedDispatchEnabled()).toBe(false);
    vi.stubEnv("NEXT_PUBLIC_STORY_UNIFIED_DISPATCH", "maybe");
    expect(isStoryUnifiedDispatchEnabled()).toBe(false);
  });
});
