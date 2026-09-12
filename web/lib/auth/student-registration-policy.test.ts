import { describe, expect, it } from "vitest";
import { resolveStudentSelfRegistrationEnabled } from "./student-registration-policy";

describe("student self-registration policy", () => {
  it("fails closed in production when no explicit decision is configured", () => {
    expect(resolveStudentSelfRegistrationEnabled({ nodeEnv: "production" })).toBe(false);
  });

  it("keeps local development usable by default", () => {
    expect(resolveStudentSelfRegistrationEnabled({ nodeEnv: "development" })).toBe(true);
    expect(resolveStudentSelfRegistrationEnabled({ nodeEnv: "test" })).toBe(true);
  });

  it("honors an explicit enabled or disabled decision", () => {
    expect(resolveStudentSelfRegistrationEnabled({
      nodeEnv: "production",
      publicSelfRegistrationEnabled: "true",
    })).toBe(true);
    expect(resolveStudentSelfRegistrationEnabled({
      nodeEnv: "development",
      publicSelfRegistrationEnabled: "false",
    })).toBe(false);
  });

  it("treats an invalid production flag as disabled", () => {
    expect(resolveStudentSelfRegistrationEnabled({
      nodeEnv: "production",
      publicSelfRegistrationEnabled: "maybe",
    })).toBe(false);
  });
});
