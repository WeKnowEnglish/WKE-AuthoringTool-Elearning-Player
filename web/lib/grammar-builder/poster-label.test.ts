import { describe, expect, it } from "vitest";
import { isLabelOnlyText } from "./poster-label";

describe("isLabelOnlyText", () => {
  it("detects short uppercase labels", () => {
    expect(isLabelOnlyText("ANY")).toBe(true);
  });

  it("rejects sentence-like text", () => {
    expect(isLabelOnlyText("Is there a book?")).toBe(false);
  });
});
