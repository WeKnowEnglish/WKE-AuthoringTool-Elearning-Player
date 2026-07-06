import { describe, expect, it } from "vitest";
import { resolveLetterFruitSlug } from "@/lib/topdown/letter-fruit-slug";

describe("resolveLetterFruitSlug", () => {
  it("prefers an explicit slug prop", () => {
    expect(resolveLetterFruitSlug("e", "a")).toBe("e");
  });

  it("falls back to the pilot selector slug", () => {
    expect(resolveLetterFruitSlug(undefined, "j_green")).toBe("j_green");
  });

  it("throws when no slug is available", () => {
    expect(() => resolveLetterFruitSlug(undefined, null)).toThrow(
      /slug prop or LetterFruitSelectorProvider/,
    );
  });
});
