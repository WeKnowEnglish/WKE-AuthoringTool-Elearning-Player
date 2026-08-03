import { describe, expect, it } from "vitest";
import {
  createGuardianInvitationToken,
  guardianInvitationExpiresAt,
  hashGuardianInvitationToken,
  isGuardianRelationshipType,
  isPlausibleGuardianInvitationToken,
  isValidGuardianEmail,
  normalizeGuardianEmail,
} from "@/lib/parent/guardian-domain";

describe("guardian domain", () => {
  it("normalizes and validates guardian email addresses", () => {
    expect(normalizeGuardianEmail("  Parent@Example.COM ")).toBe("parent@example.com");
    expect(isValidGuardianEmail("Parent@Example.COM")).toBe(true);
    expect(isValidGuardianEmail("not-an-email")).toBe(false);
    expect(isValidGuardianEmail("a @example.com")).toBe(false);
  });

  it("accepts only the supported initial relationship types", () => {
    expect(isGuardianRelationshipType("parent")).toBe(true);
    expect(isGuardianRelationshipType("guardian")).toBe(true);
    expect(isGuardianRelationshipType("caregiver")).toBe(false);
  });

  it("creates opaque tokens and deterministic SHA-256 hashes", () => {
    const token = createGuardianInvitationToken();
    expect(isPlausibleGuardianInvitationToken(token)).toBe(true);
    expect(hashGuardianInvitationToken(token)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashGuardianInvitationToken(token)).toBe(hashGuardianInvitationToken(token));
    expect(createGuardianInvitationToken()).not.toBe(token);
  });

  it("creates a future invitation expiry", () => {
    const now = new Date("2026-08-03T00:00:00.000Z");
    expect(guardianInvitationExpiresAt(now, 7)).toBe("2026-08-10T00:00:00.000Z");
  });
});
