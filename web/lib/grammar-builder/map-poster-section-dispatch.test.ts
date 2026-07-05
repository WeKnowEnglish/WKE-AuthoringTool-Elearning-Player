import { describe, expect, it } from "vitest";
import { GrammarMapError } from "./map-errors";
import { mapPosterSection } from "./map-poster-section/index";
import { parseGrammarModule } from "./validate-module";
import { readFileSync } from "node:fs";
import { PILOT_POSTER_FIXTURE_PATH } from "./fixture-path";

function loadPosterFixture() {
  return parseGrammarModule(JSON.parse(readFileSync(PILOT_POSTER_FIXTURE_PATH, "utf8")));
}

describe("mapPosterSection dispatch", () => {
  it("throws for comparison when rightColumn is missing", () => {
    const module = loadPosterFixture();
    const card = { ...module.cards[0]!, layoutType: "comparison" as const };
    delete (card as { rightColumn?: unknown }).rightColumn;

    expect(() => mapPosterSection(card)).toThrow(GrammarMapError);
  });

  it("maps two-column-positive-negative", () => {
    const section = mapPosterSection({
      id: 1,
      title: "Short answers",
      kidTitle: "Is there…?",
      theme: "sky-blue",
      layoutType: "two-column-positive-negative",
      glanceRule: { text: "Yes or No?" },
      positiveSide: { example: "Yes, there is." },
      negativeSide: { example: "No, there isn't." },
    });

    expect(section.internalLayout).toBe("positive_negative");
  });

  it("maps comparison when columns are present", () => {
    const section = mapPosterSection({
      id: 1,
      title: "Spelling",
      kidTitle: "-f / -fe",
      theme: "lavender",
      layoutType: "comparison",
      glanceRule: { text: "Rule vs exceptions" },
      leftColumn: {
        title: "Rule",
        items: [{ text: "leaf → leaves" }],
      },
      rightColumn: {
        title: "Exceptions",
        items: [{ text: "roof → roofs" }],
      },
    });

    expect(section.internalLayout).toBe("comparison");
  });

  it("maps summary-grid when summaryGrid is present", () => {
    const section = mapPosterSection({
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
    });

    expect(section.internalLayout).toBe("summary_grid");
  });

  it("maps full-width layoutType", () => {
    const section = mapPosterSection({
      id: 1,
      title: "Rule",
      kidTitle: "Add -s",
      theme: "sky-blue",
      layoutType: "full-width",
      glanceRule: { text: "Most nouns + s" },
      items: [{ text: "book → books", graphic: "📘" }],
    });

    expect(section.internalLayout).toBe("full_width");
  });

  it("maps four-card-grid layoutType", () => {
    const section = mapPosterSection({
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
    });

    expect(section.internalLayout).toBe("four_card_grid");
  });
});
