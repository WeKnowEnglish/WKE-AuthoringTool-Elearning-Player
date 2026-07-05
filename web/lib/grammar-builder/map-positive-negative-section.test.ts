import { describe, expect, it } from "vitest";
import { GrammarMapError } from "./map-errors";
import { mapPositiveNegativeSection } from "./map-poster-section/map-positive-negative-section";
import { parseGrammarModule } from "./validate-module";
import { readFileSync } from "node:fs";
import { PILOT_POSTER_FIXTURE_PATH } from "./fixture-path";

function loadPosterFixture() {
  return parseGrammarModule(JSON.parse(readFileSync(PILOT_POSTER_FIXTURE_PATH, "utf8")));
}

describe("mapPositiveNegativeSection", () => {
  it("maps positive and negative panels", () => {
    const card = {
      id: 1,
      title: "Short answers",
      kidTitle: "Is there…?",
      theme: "sky-blue" as const,
      layoutType: "two-column-positive-negative" as const,
      glanceRule: { text: "Yes or No?" },
      positiveSide: { title: "YES", example: "Yes, there is." },
      negativeSide: { title: "NO", example: "No, there isn't." },
    };

    const section = mapPositiveNegativeSection(card, {
      requireKidTitle: false,
      requireGlanceRule: false,
    });

    expect(section.internalLayout).toBe("positive_negative");
    expect(section.positivePanel?.title).toBe("YES");
    expect(section.positivePanel?.example).toBe("Yes, there is.");
    expect(section.negativePanel?.example).toBe("No, there isn't.");
  });

  it("throws when positiveSide is missing", () => {
    const module = loadPosterFixture();
    const card = {
      ...module.cards[0]!,
      layoutType: "two-column-positive-negative" as const,
      positiveSide: { example: "Yes" },
      negativeSide: { example: "No" },
    };
    delete (card as { positiveSide?: unknown }).positiveSide;

    expect(() =>
      mapPositiveNegativeSection(card, { requireKidTitle: false, requireGlanceRule: false }),
    ).toThrow(GrammarMapError);
  });
});
