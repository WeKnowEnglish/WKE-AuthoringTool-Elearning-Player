import { describe, expect, it } from "vitest";
import { isAllowedGrammarGraphicUrl, sanitizeGrammarGraphicUrl } from "./graphic-asset";

describe("graphic-asset", () => {
  it("allows https, http, and root-relative paths", () => {
    expect(isAllowedGrammarGraphicUrl("https://cdn.example.com/icon.png")).toBe(true);
    expect(isAllowedGrammarGraphicUrl("http://cdn.example.com/icon.png")).toBe(true);
    expect(isAllowedGrammarGraphicUrl("/images/book.png")).toBe(true);
  });

  it("rejects unsafe or malformed urls", () => {
    expect(isAllowedGrammarGraphicUrl("javascript:alert(1)")).toBe(false);
    expect(isAllowedGrammarGraphicUrl("//evil.example")).toBe(false);
    expect(isAllowedGrammarGraphicUrl("not a url")).toBe(false);
    expect(sanitizeGrammarGraphicUrl("  ")).toBeUndefined();
  });
});
