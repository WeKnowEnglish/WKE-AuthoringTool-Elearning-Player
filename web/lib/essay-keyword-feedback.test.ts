import { describe, expect, it } from "vitest";
import { countKeywordMatchesInText } from "./essay-keyword-feedback";

describe("countKeywordMatchesInText", () => {
  it("returns zeros for empty keywords", () => {
    expect(countKeywordMatchesInText("hello", [])).toEqual({ matched: 0, total: 0 });
  });

  it("matches whole words case-insensitively", () => {
    expect(
      countKeywordMatchesInText("The Cat sat.", ["cat", "dog"]),
    ).toEqual({ matched: 1, total: 2 });
  });

  it("does not match substrings as words", () => {
    expect(countKeywordMatchesInText("category", ["cat"])).toEqual({ matched: 0, total: 1 });
  });

  it("handles punctuation next to words", () => {
    expect(countKeywordMatchesInText("Hello, world!", ["world"])).toEqual({
      matched: 1,
      total: 1,
    });
  });
});
