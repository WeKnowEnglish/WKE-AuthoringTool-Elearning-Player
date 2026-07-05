import { describe, expect, it } from "vitest";
import { mapPosterHero } from "./map-poster-hero";
import type { GrammarModule } from "./schema";

function makeModule(moduleTitle: string): GrammarModule {
  return {
    moduleTitle,
    displayMode: "poster",
    pageLayout: "two-equal-then-full",
    cards: [],
  };
}

describe("mapPosterHero", () => {
  it("derives hero highlights from moduleTitle", () => {
    const hero = mapPosterHero(makeModule("THERE IS / THERE ARE — QUESTIONS"));

    expect(hero.highlightA.text).toBe("THERE IS");
    expect(hero.highlightB.text).toBe("THERE ARE");
    expect(hero.suffix).toBe("QUESTIONS");
    expect(hero.highlightA.color).toBe("#2563eb");
    expect(hero.highlightB.color).toBe("#ea580c");
  });

  it("falls back to the full title when parsing fails", () => {
    const hero = mapPosterHero(makeModule("Countable Nouns"));

    expect(hero.highlightA.text).toBe("Countable Nouns");
    expect(hero.highlightB.text).toBe("");
    expect(hero.suffix).toBe("");
  });
});
