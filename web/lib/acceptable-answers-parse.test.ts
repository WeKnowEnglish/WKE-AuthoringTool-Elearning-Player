import { describe, expect, it } from "vitest";
import { parseAcceptableAnswersInput } from "./acceptable-answers-parse";

describe("parseAcceptableAnswersInput", () => {
  it("returns empty for blank", () => {
    expect(parseAcceptableAnswersInput("  ")).toEqual([]);
  });

  it("splits lines and semicolons", () => {
    expect(parseAcceptableAnswersInput("Hello\nHi;Hey")).toEqual(["Hello", "Hi", "Hey"]);
  });

  it("splits single line on commas when no newlines or semicolons", () => {
    expect(parseAcceptableAnswersInput("Hello, Hi, Hey")).toEqual(["Hello", "Hi", "Hey"]);
  });

  it("does not split on commas when newlines present", () => {
    expect(parseAcceptableAnswersInput("Hello, world\nNext")).toEqual(["Hello, world", "Next"]);
  });

  it("treats Windows CRLF as a line break", () => {
    expect(parseAcceptableAnswersInput("A\r\nB")).toEqual(["A", "B"]);
  });
});
