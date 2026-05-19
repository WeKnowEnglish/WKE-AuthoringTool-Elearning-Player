import { describe, expect, it } from "vitest";
import {
  normalizeUsername,
  usernameToStudentEmail,
  validateStudentPin,
  validateUsername,
} from "@/lib/auth/student-credentials";

describe("student-credentials", () => {
  it("normalizes usernames", () => {
    expect(normalizeUsername("  Mai Dragon  ")).toBe("mai_dragon");
  });

  it("maps to synthetic email", () => {
    expect(usernameToStudentEmail("mai_dragon")).toBe(
      "mai_dragon@students.wke.internal",
    );
  });

  it("validates pin length", () => {
    expect(validateStudentPin("123")).not.toBeNull();
    expect(validateStudentPin("1234")).toBeNull();
    expect(validateStudentPin("123456")).toBeNull();
    expect(validateStudentPin("1234567")).not.toBeNull();
  });

  it("validates username rules", () => {
    expect(validateUsername("ab")).not.toBeNull();
    expect(validateUsername("mai_1")).toBeNull();
  });
});
