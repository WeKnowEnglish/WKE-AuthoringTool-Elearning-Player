import { describe, expect, it } from "vitest";
import { resolveAppReleaseVersion } from "./app-release";

describe("app release version", () => {
  it("prefers the host-agnostic git sha", () => {
    expect(
      resolveAppReleaseVersion({
        NEXT_PUBLIC_GIT_COMMIT_SHA: "hostinger-sha",
      }),
    ).toBe("hostinger-sha");
  });

  it("uses development when no sha is configured", () => {
    expect(resolveAppReleaseVersion({})).toBe("development");
    expect(
      resolveAppReleaseVersion({
        NEXT_PUBLIC_GIT_COMMIT_SHA: "  ",
      }),
    ).toBe("development");
  });
});
