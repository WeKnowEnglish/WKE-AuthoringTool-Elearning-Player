import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { GrammarMapError } from "./map-errors";
import { PILOT_POSTER_FIXTURE_PATH } from "./fixture-path";
import { mapPosterItem } from "./map-poster-item";
import { inferPosterLayout, mapPosterSection } from "./map-poster-section";
import { parseGrammarModule } from "./validate-module";

function loadPosterFixture() {
  return parseGrammarModule(JSON.parse(readFileSync(PILOT_POSTER_FIXTURE_PATH, "utf8")));
}

describe("mapPosterItem", () => {
  it("maps grammar items to poster examples", () => {
    expect(
      mapPosterItem({
        text: "Is there a book?",
        graphic: "📘",
        highlight: "Is there",
        caption: "desk",
      }),
    ).toEqual({
      sentence: "Is there a book?",
      emoji: "📘",
      highlight: "Is there",
      label: "desk",
      align: "center",
    });
  });
});

describe("inferPosterLayout", () => {
  it("maps two-equal with sentence examples to 50_50", () => {
    const module = loadPosterFixture();
    expect(inferPosterLayout(module.cards[0]!)).toBe("50_50");
  });

  it("maps two-equal with ANY label-only left item to 30_70", () => {
    const module = loadPosterFixture();
    const narrowCard = {
      ...module.cards[0]!,
      leftColumn: {
        title: "PLURAL",
        badge: "👧👦",
        items: [{ text: "ANY", caption: "people" }],
      },
    };
    expect(inferPosterLayout(narrowCard)).toBe("30_70");
  });

  it("maps banner layout type to banner", () => {
    const module = loadPosterFixture();
    expect(inferPosterLayout(module.cards[2]!)).toBe("banner");
  });
});

describe("mapPosterSection", () => {
  it("maps card 1 to a two_equal section with theme palette", () => {
    const module = loadPosterFixture();
    const section = mapPosterSection(module.cards[0]!);

    expect(section.internalLayout).toBe("two_equal");
    expect(section.kidTitle).toBe("Is there…?");
    expect(section.leftLabel).toBe("SINGULAR");
    expect(section.leftEmoji).toBe("⭐");
    expect(section.rightLabel).toBe("UNCOUNTABLE");
    expect(section.rightEmoji).toBe("💧");
    expect(section.theme).toBe("sky-blue");
    expect(section.palette?.header).toBe("#2563eb");
    expect(section.leftExamples?.[0]?.sentence).toContain("book");
  });

  it("maps card 2 to a full_width plural section", () => {
    const module = loadPosterFixture();
    const section = mapPosterSection(module.cards[1]!);

    expect(section.internalLayout).toBe("full_width");
    expect(section.subHeader?.label).toBe("PLURAL");
    expect(section.stackedExamples?.[0]?.sentence).toContain("chairs");
  });

  it("maps card 3 to a banner remember section", () => {
    const module = loadPosterFixture();
    const section = mapPosterSection(module.cards[2]!);

    expect(section.internalLayout).toBe("banner");
    expect(section.rememberBanner?.body).toBe("Put Is or Are before There.");
    expect(section.rememberBanner?.highlight).toBe("Is or Are first");
  });

  it("maps three-column layoutType", () => {
    const module = loadPosterFixture();
    const card = {
      ...module.cards[0]!,
      layoutType: "three-column" as const,
      items: [
        {
          text: "There is a book.",
          graphic: "📘",
          caption: "on the desk.",
        },
      ],
      leftColumn: undefined,
      rightColumn: undefined,
    };

    const section = mapPosterSection(card, { requireKidTitle: false, requireGlanceRule: false });
    expect(section.internalLayout).toBe("three_column");
    expect(section.columns).toHaveLength(1);
  });

  it("throws for unsupported layout types", () => {
    const module = loadPosterFixture();
    const card = {
      ...module.cards[0]!,
      layoutType: "not-a-layout" as "two-equal",
    };

    expect(() => mapPosterSection(card)).toThrow(GrammarMapError);
  });

  it("maps full-width layoutType", () => {
    const section = mapPosterSection(
      {
        id: 1,
        title: "Rule",
        kidTitle: "Add -s",
        theme: "sky-blue",
        layoutType: "full-width",
        glanceRule: { text: "Most nouns + s" },
        items: [{ text: "book → books", graphic: "📘" }],
      },
      { requireKidTitle: false, requireGlanceRule: false },
    );

    expect(section.internalLayout).toBe("full_width");
  });

  it("maps four-card-grid layoutType", () => {
    const section = mapPosterSection(
      {
        id: 1,
        title: "Rules",
        kidTitle: "Rules",
        theme: "tangerine",
        layoutType: "four-card-grid",
        glanceRule: { text: "Four patterns" },
        miniCards: [
          { title: "A", rule: "a", theme: "sky-blue" },
          { title: "B", rule: "b", theme: "mint-green" },
          { title: "C", rule: "c", theme: "sun-gold" },
          { title: "D", rule: "d", theme: "bubblegum" },
        ],
      },
      { requireKidTitle: false, requireGlanceRule: false },
    );

    expect(section.internalLayout).toBe("four_card_grid");
  });

  it("maps summary-grid layoutType", () => {
    const section = mapPosterSection(
      {
        id: 1,
        title: "Summary",
        kidTitle: "Summary",
        theme: "lavender",
        layoutType: "summary-grid",
        glanceRule: { text: "Some or Any?" },
        summaryGrid: {
          columns: [{ label: "SOME" }, { label: "ANY" }],
          rows: [
            {
              label: "Affirmative",
              cells: [{ mark: "check" }, { mark: "cross" }],
            },
          ],
        },
      },
      { requireKidTitle: false, requireGlanceRule: false },
    );

    expect(section.internalLayout).toBe("summary_grid");
  });
});
