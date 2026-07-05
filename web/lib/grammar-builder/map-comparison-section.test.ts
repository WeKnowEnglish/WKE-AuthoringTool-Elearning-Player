import { describe, expect, it } from "vitest";
import { GrammarMapError } from "./map-errors";
import { mapComparisonSection } from "./map-poster-section/map-comparison-section";

describe("mapComparisonSection", () => {
  it("maps rule and exception columns", () => {
    const card = {
      id: 1,
      title: "Nouns ending in -f",
      kidTitle: "-f / -fe",
      theme: "lavender" as const,
      layoutType: "comparison" as const,
      glanceRule: { text: "Most change to -ves" },
      leftColumn: {
        title: "Change to -ves",
        items: [{ text: "leaf → leaves", graphic: "🍃" }],
      },
      rightColumn: {
        title: "Exceptions (+s)",
        items: [{ text: "roof → roofs", graphic: "🏠" }],
      },
    };

    const section = mapComparisonSection(card, {
      requireKidTitle: false,
      requireGlanceRule: false,
    });

    expect(section.internalLayout).toBe("comparison");
    expect(section.comparisonLeft?.title).toBe("Change to -ves");
    expect(section.comparisonLeft?.items[0]?.sentence).toBe("leaf → leaves");
    expect(section.comparisonLeft?.items[0]?.emoji).toBe("🍃");
    expect(section.comparisonRight?.title).toBe("Exceptions (+s)");
  });

  it("throws when leftColumn is missing", () => {
    const card = {
      id: 1,
      title: "Comparison",
      theme: "lavender" as const,
      layoutType: "comparison" as const,
      rightColumn: {
        title: "Exceptions",
        items: [{ text: "roof → roofs" }],
      },
    };

    expect(() =>
      mapComparisonSection(card as Parameters<typeof mapComparisonSection>[0], {
        requireKidTitle: false,
        requireGlanceRule: false,
      }),
    ).toThrow(GrammarMapError);
  });
});
