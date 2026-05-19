import { describe, expect, it } from "vitest";
import { interpolatePuppetScriptText } from "./script-vars";

describe("interpolatePuppetScriptText", () => {
  it("substitutes vars", () => {
    expect(interpolatePuppetScriptText("I like {{food}}.", { food: "bread" })).toBe(
      "I like bread.",
    );
  });

  it("leaves unknown placeholders", () => {
    expect(interpolatePuppetScriptText("Hi {{name}}", {})).toBe("Hi {{name}}");
  });
});
