import { describe, expect, it } from "vitest";
import { parseModuleTitleHero } from "./parse-module-title-hero";

describe("parseModuleTitleHero", () => {
  it("parses slash-and-dash module titles", () => {
    expect(parseModuleTitleHero("THERE IS / THERE ARE — QUESTIONS")).toEqual({
      highlightA: "THERE IS",
      highlightB: "THERE ARE",
      suffix: "QUESTIONS",
    });
  });

  it("parses titles without a suffix", () => {
    expect(parseModuleTitleHero("FOO / BAR")).toEqual({
      highlightA: "FOO",
      highlightB: "BAR",
      suffix: "",
    });
  });

  it("returns null for single-part titles", () => {
    expect(parseModuleTitleHero("Present Simple")).toBeNull();
  });
});
