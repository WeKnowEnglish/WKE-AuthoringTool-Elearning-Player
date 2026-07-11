import { describe, expect, it } from "vitest";
import { validateTeacherAccessRequest } from "./request-validation";

const valid = {
  fullName: "Mai Nguyen",
  email: "MAI@EXAMPLE.COM",
  school: "We Know English",
  reason: "I teach Grade 7 English and need to review student progress.",
};

describe("teacher access request validation", () => {
  it("normalizes a valid request", () => {
    expect(validateTeacherAccessRequest(valid)).toEqual({
      ok: true,
      value: { ...valid, email: "mai@example.com" },
    });
  });

  it("rejects invalid email and short reasons", () => {
    expect(validateTeacherAccessRequest({ ...valid, email: "bad" }).ok).toBe(false);
    expect(validateTeacherAccessRequest({ ...valid, reason: "teacher" }).ok).toBe(false);
  });

  it("rejects the hidden bot field", () => {
    expect(validateTeacherAccessRequest({ ...valid, website: "https://spam.test" }).ok).toBe(false);
  });
});
