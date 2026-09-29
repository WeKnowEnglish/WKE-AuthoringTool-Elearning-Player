import { describe, expect, it } from "vitest";
import { canReadOwnSecretRole } from "@/lib/secret-roles/access-policy";
import {
  decodeVcMemberToken,
  encodeVcMemberToken,
  type VirtualClassroomMemberToken,
} from "@/lib/virtual-classroom/session-cookie";

function member(overrides: Partial<VirtualClassroomMemberToken> = {}): VirtualClassroomMemberToken {
  return {
    sessionId: "vcs_one",
    joinCode: "ABC123",
    roomId: "wke-vc-session-ABC123",
    userId: "student-a",
    displayName: "An",
    role: "member",
    expiresAt: Date.now() + 60_000,
    ...overrides,
  };
}

describe("Secret Roles member authorization", () => {
  it("accepts only a student token for the round's classroom", () => {
    expect(canReadOwnSecretRole({ sessionId: "vcs_one" }, member())).toBe(true);
    expect(
      canReadOwnSecretRole({ sessionId: "vcs_one" }, member({ sessionId: "vcs_other" })),
    ).toBe(false);
    expect(canReadOwnSecretRole({ sessionId: "vcs_one" }, member({ role: "host" }))).toBe(false);
    expect(canReadOwnSecretRole({ sessionId: "vcs_one" }, null)).toBe(false);
  });

  it("rejects an expired signed classroom token before policy evaluation", () => {
    const expired = encodeVcMemberToken(member({ expiresAt: Date.now() - 1 }));
    expect(decodeVcMemberToken(expired)).toBeNull();
  });

  it("binds the student projection to the signed token's user id", () => {
    const encoded = encodeVcMemberToken(member({ userId: "student-a" }));
    const decoded = decodeVcMemberToken(encoded);
    expect(canReadOwnSecretRole({ sessionId: "vcs_one" }, decoded)).toBe(true);
    expect(decoded?.userId).toBe("student-a");
  });
});
