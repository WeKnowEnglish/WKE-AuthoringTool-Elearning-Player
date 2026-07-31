import { describe, expect, it } from "vitest";
import {
  robotsIndexFollow,
  robotsNoIndexFollow,
  robotsNoIndexNoFollow,
} from "@/lib/seo/robots-policy";

describe("robots policy helpers", () => {
  it("keeps follow enabled for login/gateway noindex pages", () => {
    expect(robotsNoIndexFollow).toEqual({ index: false, follow: true });
  });

  it("disables follow for sessions, editors, and players", () => {
    expect(robotsNoIndexNoFollow).toEqual({ index: false, follow: false });
  });

  it("indexes public marketing pages", () => {
    expect(robotsIndexFollow).toEqual({ index: true, follow: true });
  });
});
