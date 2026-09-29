import { describe, expect, it } from "vitest";

import { buildTeacherConfirmationUrl } from "@/lib/admin/teacher-invitation";

describe("buildTeacherConfirmationUrl", () => {
  it("keeps the one-time token in a first-party confirmation route", () => {
    const result = new URL(
      buildTeacherConfirmationUrl({
        origin: "https://weknowenglish.online",
        tokenHash: "hashed-token-value",
        type: "invite",
      }),
    );

    expect(result.origin).toBe("https://weknowenglish.online");
    expect(result.pathname).toBe("/auth/confirm");
    expect(result.searchParams.get("token_hash")).toBe("hashed-token-value");
    expect(result.searchParams.get("type")).toBe("invite");
    expect(result.searchParams.get("next")).toBe("/teacher/set-password");
  });
});
