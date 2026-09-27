import { describe, expect, it } from "vitest";
import {
  requestedLoginRole,
  shouldAutoRedirectFromLogin,
} from "@/lib/auth/login-account-switch";

describe("login account switching", () => {
  it("normalizes only the two supported portal roles", () => {
    expect(requestedLoginRole(" student ")).toBe("student");
    expect(requestedLoginRole("TEACHER")).toBe("teacher");
    expect(requestedLoginRole("parent")).toBeNull();
  });

  it("keeps the normal automatic redirect without an explicit portal", () => {
    expect(
      shouldAutoRedirectFromLogin({
        currentRole: "teacher",
        requestedPortal: null,
      }),
    ).toBe(true);
  });

  it("redirects when the signed-in role matches the requested portal", () => {
    expect(
      shouldAutoRedirectFromLogin({
        currentRole: "student",
        requestedPortal: "student",
      }),
    ).toBe(true);
  });

  it("shows login when a different portal was explicitly requested", () => {
    expect(
      shouldAutoRedirectFromLogin({
        currentRole: "teacher",
        requestedPortal: "student",
      }),
    ).toBe(false);
    expect(
      shouldAutoRedirectFromLogin({
        currentRole: "student",
        requestedPortal: "teacher",
      }),
    ).toBe(false);
  });

  it("shows login for an anonymous visitor", () => {
    expect(
      shouldAutoRedirectFromLogin({
        currentRole: null,
        requestedPortal: "student",
      }),
    ).toBe(false);
  });
});
