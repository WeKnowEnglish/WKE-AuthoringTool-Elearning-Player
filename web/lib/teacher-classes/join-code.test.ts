import { describe, expect, it } from "vitest";
import {
  generateJoinCode,
  isValidJoinCodeFormat,
  joinCodeValidationError,
  JOIN_CODE_LENGTH,
  normalizeJoinCode,
} from "@/lib/teacher-classes/join-code";

describe("join-code", () => {
  it("normalizes to uppercase trimmed", () => {
    expect(normalizeJoinCode("  abcd23  ")).toBe("ABCD23");
  });

  it("validates format", () => {
    expect(isValidJoinCodeFormat("ABCDEF")).toBe(true);
    expect(isValidJoinCodeFormat("ABCDE")).toBe(false);
    expect(isValidJoinCodeFormat("ABCDO1")).toBe(false);
  });

  it("generates fixed-length codes", () => {
    const code = generateJoinCode(() => 0);
    expect(code).toHaveLength(JOIN_CODE_LENGTH);
    expect(isValidJoinCodeFormat(code)).toBe(true);
  });

  it("returns validation errors for empty and short codes", () => {
    expect(joinCodeValidationError("")).toBe("Enter your class code.");
    expect(joinCodeValidationError("ABC")).toMatch(/6 characters/);
  });
});
