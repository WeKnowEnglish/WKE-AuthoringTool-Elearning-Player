import { describe, expect, it } from "vitest";
import { GrammarMapError } from "./map-errors";
import { mapFourCardGridSection } from "./map-poster-section/map-four-card-grid-section";

describe("mapFourCardGridSection", () => {
  it("maps four mini cards", () => {
    const section = mapFourCardGridSection(
      {
        id: 1,
        title: "Rules",
        kidTitle: "Rules",
        theme: "tangerine",
        layoutType: "four-card-grid",
        glanceRule: { text: "Four patterns" },
        miniCards: [
          { title: "Regular -s", rule: "book, pen", formula: "+ s", theme: "sky-blue" },
          { title: "Add -es", rule: "box, bus", formula: "+ es", theme: "mint-green" },
          { title: "Consonant + y", rule: "baby, city", formula: "y → ies", theme: "sun-gold" },
          { title: "Vowel + y", rule: "boy, toy", formula: "+ s", theme: "bubblegum" },
        ],
      },
      { requireKidTitle: false, requireGlanceRule: false },
    );

    expect(section.internalLayout).toBe("four_card_grid");
    expect(section.miniCards).toHaveLength(4);
    expect(section.miniCards?.[0]?.formula).toBe("+ s");
  });

  it("throws when miniCards count is not 4", () => {
    expect(() =>
      mapFourCardGridSection(
        {
          id: 1,
          title: "Rules",
          theme: "tangerine",
          layoutType: "four-card-grid",
          miniCards: [{ title: "One", rule: "only one" }],
        } as Parameters<typeof mapFourCardGridSection>[0],
        { requireKidTitle: false, requireGlanceRule: false },
      ),
    ).toThrow(GrammarMapError);
  });
});
