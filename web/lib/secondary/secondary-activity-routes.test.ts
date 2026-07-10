import { describe, expect, it } from "vitest";
import {
  buildSecondaryActivityHref,
  parseSecondaryActivitySearchParams,
} from "@/lib/secondary/secondary-activity-routes";

describe("secondary-activity-routes", () => {
  it("builds practice and review hrefs", () => {
    expect(buildSecondaryActivityHref("match")).toBe("/secondary/match");
    expect(buildSecondaryActivityHref("match", { mode: "review" })).toBe(
      "/secondary/match?mode=review",
    );
    expect(buildSecondaryActivityHref("cloze", { retry: true })).toBe("/secondary/cloze?retry=1");
  });

  it("parses search params", () => {
    expect(
      parseSecondaryActivitySearchParams({
        get: (name) => (name === "mode" ? "review" : name === "retry" ? "1" : null),
      }),
    ).toEqual({ mode: "review", retry: true });
  });
});
