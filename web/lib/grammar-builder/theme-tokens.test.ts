import { describe, expect, it } from "vitest";
import { getThemeToken, resolveCardPalette } from "./theme-tokens";

describe("resolveCardPalette", () => {
  it("resolves sky-blue palette from theme tokens", () => {
    const palette = resolveCardPalette("sky-blue");

    expect(palette.header).toBe("#2563eb");
    expect(palette.body).toBe("#dbeafe");
    expect(palette.border).toBe("#60a5fa");
    expect(palette.pill).toBe("#bfdbfe");
    expect(palette.text).toBe("#1e3a8a");
  });

  it("resolves tangerine palette from theme tokens", () => {
    const palette = resolveCardPalette("tangerine");

    expect(palette.header).toBe("#ea580c");
    expect(palette.body).toBe("#ffedd5");
  });

  it("resolves lavender palette from theme tokens", () => {
    const palette = resolveCardPalette("lavender");

    expect(palette.header).toBe("#9333ea");
    expect(palette.body).toBe("#f3e8ff");
  });

  it("getThemeToken returns label without tailwind block", () => {
    const token = getThemeToken("mint-green");

    expect(token.label).toBe("Mint Green");
    expect(token).not.toHaveProperty("tailwind");
  });
});
