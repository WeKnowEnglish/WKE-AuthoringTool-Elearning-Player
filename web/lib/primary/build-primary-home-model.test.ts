import { describe, expect, it } from "vitest";
import { initialsFromDisplayName } from "./build-primary-home-model";

describe("initialsFromDisplayName", () => {
  it("uses first letters of two names", () => {
    expect(initialsFromDisplayName("Alex Kim")).toBe("AK");
  });

  it("uses up to two letters of a single name", () => {
    expect(initialsFromDisplayName("Alex")).toBe("AL");
  });

  it("falls back when empty", () => {
    expect(initialsFromDisplayName(null)).toBe("?");
    expect(initialsFromDisplayName("  ")).toBe("?");
  });
});
