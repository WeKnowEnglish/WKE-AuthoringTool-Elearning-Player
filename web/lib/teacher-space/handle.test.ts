import { describe, expect, it } from "vitest";
import {
  assertValidTeacherSpaceHandle,
  normalizeTeacherSpaceHandle,
  RESERVED_TEACHER_SPACE_HANDLES,
  suggestHandleFromEmail,
} from "./handle";

describe("teacher space handle", () => {
  it("normalizes and accepts valid handles", () => {
    expect(normalizeTeacherSpaceHandle("  Brady-WKE  ")).toBe("brady-wke");
    expect(assertValidTeacherSpaceHandle("brady-wke")).toBe("brady-wke");
    expect(assertValidTeacherSpaceHandle("ab3")).toBe("ab3");
  });

  it("rejects invalid shapes and reserved words", () => {
    expect(() => assertValidTeacherSpaceHandle("ab")).toThrow(/3–32/);
    expect(() => assertValidTeacherSpaceHandle("-brady")).toThrow(/3–32|lowercase/);
    expect(() => assertValidTeacherSpaceHandle("Teacher")).toThrow(/reserved|lowercase/);
    expect(RESERVED_TEACHER_SPACE_HANDLES.has("teacher")).toBe(true);
    expect(() => assertValidTeacherSpaceHandle("teacher")).toThrow(/reserved/);
  });

  it("suggests from email", () => {
    const handle = suggestHandleFromEmail("Brady.Smith@example.com");
    expect(handle.length).toBeGreaterThanOrEqual(3);
    expect(handle).toMatch(/^[a-z0-9]/);
  });
});
