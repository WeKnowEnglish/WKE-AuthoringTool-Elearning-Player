import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  GrammarModuleParseError,
  parseGrammarModule,
  safeParseGrammarModule,
} from "./validate-module";
import { PILOT_POSTER_FIXTURE_PATH } from "./fixture-path";

function loadPosterFixture(): unknown {
  return JSON.parse(readFileSync(PILOT_POSTER_FIXTURE_PATH, "utf8"));
}

describe("parseGrammarModule", () => {
  it("parses the A1 there-is poster fixture", () => {
    const module = parseGrammarModule(loadPosterFixture());

    expect(module.moduleTitle).toContain("THERE IS");
    expect(module.displayMode).toBe("poster");
    expect(module.difficulty).toBe("A1");
    expect(module.cards).toHaveLength(3);
    expect(module.cards[0]?.layoutType).toBe("two-equal");
    expect(module.cards[0]?.leftColumn?.items[0]?.text).toContain("book");
    expect(module.cards[2]?.layoutType).toBe("banner");
    expect(module.cards[2]?.bannerText).toBeTruthy();
  });

  it("rejects missing moduleTitle", () => {
    const raw = loadPosterFixture() as Record<string, unknown>;
    delete raw.moduleTitle;

    expect(() => parseGrammarModule(raw)).toThrow(GrammarModuleParseError);
  });

  it("rejects invalid theme id", () => {
    const raw = structuredClone(loadPosterFixture()) as {
      cards: { theme: string }[];
    };
    raw.cards[0]!.theme = "blue";

    const result = safeParseGrammarModule(raw);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("theme"))).toBe(true);
    }
  });

  it("rejects A1 poster with more than 3 cards", () => {
    const raw = structuredClone(loadPosterFixture()) as { cards: unknown[] };
    raw.cards.push(structuredClone(raw.cards[0]));

    const result = safeParseGrammarModule(raw);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message.includes("3 cards"))).toBe(true);
    }
  });

  it("rejects two-equal card missing leftColumn", () => {
    const raw = structuredClone(loadPosterFixture()) as {
      cards: { leftColumn?: unknown }[];
    };
    delete raw.cards[0]!.leftColumn;

    const result = safeParseGrammarModule(raw);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("leftColumn"))).toBe(true);
    }
  });

  it("rejects banner card missing bannerText", () => {
    const raw = structuredClone(loadPosterFixture()) as {
      cards: { bannerText?: string }[];
    };
    delete raw.cards[2]!.bannerText;

    const result = safeParseGrammarModule(raw);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("bannerText"))).toBe(true);
    }
  });

  it("rejects poster modules with footer tags", () => {
    const raw = structuredClone(loadPosterFixture()) as { tags: string[] };
    raw.tags = ["#EnglishGrammar"];

    const result = safeParseGrammarModule(raw);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path === "tags")).toBe(true);
    }
  });

  it("rejects poster card missing glanceRule", () => {
    const raw = structuredClone(loadPosterFixture()) as {
      cards: { glanceRule?: unknown }[];
    };
    delete raw.cards[0]!.glanceRule;

    const result = safeParseGrammarModule(raw);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("glanceRule"))).toBe(true);
    }
  });

  it("allows relaxed poster rules when posterContentRules is false", () => {
    const raw = structuredClone(loadPosterFixture()) as {
      tags: string[];
      cards: { glanceRule?: unknown }[];
    };
    raw.tags = ["#EnglishGrammar"];
    delete raw.cards[0]!.glanceRule;

    const result = safeParseGrammarModule(raw, { posterContentRules: false });
    expect(result.success).toBe(true);
  });

  it("rejects poster card missing kidTitle", () => {
    const raw = structuredClone(loadPosterFixture()) as {
      cards: { kidTitle?: string }[];
    };
    delete raw.cards[0]!.kidTitle;

    const result = safeParseGrammarModule(raw);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("kidTitle"))).toBe(true);
    }
  });

  it("rejects duplicate card ids", () => {
    const raw = structuredClone(loadPosterFixture()) as { cards: { id: number }[] };
    raw.cards[1]!.id = raw.cards[0]!.id;

    const result = safeParseGrammarModule(raw);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message.includes("Duplicate card id"))).toBe(
        true,
      );
    }
  });

  it("rejects banner card missing leftSide.content", () => {
    const raw = structuredClone(loadPosterFixture()) as {
      cards: { leftSide?: { content?: string } }[];
    };
    delete raw.cards[2]!.leftSide!.content;

    const result = safeParseGrammarModule(raw);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("leftSide"))).toBe(true);
    }
  });

  it("rejects unknown top-level properties", () => {
    const raw = {
      ...(loadPosterFixture() as Record<string, unknown>),
      unexpectedField: true,
    };

    const result = safeParseGrammarModule(raw);
    expect(result.success).toBe(false);
  });

  it("rejects three-column card missing items", () => {
    const raw = structuredClone(loadPosterFixture()) as {
      cards: { layoutType: string; items?: unknown[]; leftColumn?: unknown; rightColumn?: unknown }[];
    };
    raw.cards[0]!.layoutType = "three-column";
    delete raw.cards[0]!.items;
    delete raw.cards[0]!.leftColumn;
    delete raw.cards[0]!.rightColumn;

    const result = safeParseGrammarModule(raw);
    expect(result.success).toBe(false);
  });

  it("rejects full-width-split card missing rightSide", () => {
    const raw = structuredClone(loadPosterFixture()) as {
      cards: { layoutType: string; leftSide?: unknown; rightSide?: unknown; bannerText?: string }[];
    };
    raw.cards[2]!.layoutType = "full-width-split";
    raw.cards[2]!.leftSide = { content: "Left" };
    delete raw.cards[2]!.rightSide;
    delete raw.cards[2]!.bannerText;

    const result = safeParseGrammarModule(raw);
    expect(result.success).toBe(false);
  });

  it("rejects positive-negative card missing negativeSide", () => {
    const raw = {
      moduleTitle: "Test",
      pageLayout: "two-equal-then-full",
      cards: [
        {
          id: 1,
          title: "Card",
          theme: "sky-blue",
          layoutType: "two-column-positive-negative",
          positiveSide: { example: "Yes" },
        },
      ],
    };

    const result = safeParseGrammarModule(raw, { posterContentRules: false });
    expect(result.success).toBe(false);
  });

  it("rejects comparison card missing rightColumn", () => {
    const raw = {
      moduleTitle: "Test",
      pageLayout: "two-equal-then-full",
      cards: [
        {
          id: 1,
          title: "Card",
          theme: "lavender",
          layoutType: "comparison",
          leftColumn: { title: "Rule", items: [{ text: "a → b" }] },
        },
      ],
    };

    const result = safeParseGrammarModule(raw, { posterContentRules: false });
    expect(result.success).toBe(false);
  });

  it("rejects summary-grid card missing summaryGrid", () => {
    const raw = {
      moduleTitle: "Test",
      pageLayout: "two-equal-then-full",
      cards: [
        {
          id: 1,
          title: "Card",
          theme: "lavender",
          layoutType: "summary-grid",
        },
      ],
    };

    const result = safeParseGrammarModule(raw, { posterContentRules: false });
    expect(result.success).toBe(false);
  });

  it("rejects summary-grid row with wrong cell count", () => {
    const raw = {
      moduleTitle: "Test",
      pageLayout: "two-equal-then-full",
      cards: [
        {
          id: 1,
          title: "Card",
          theme: "lavender",
          layoutType: "summary-grid",
          summaryGrid: {
            columns: [{ label: "A" }, { label: "B" }],
            rows: [{ label: "Row", cells: [{ mark: "check" }] }],
          },
        },
      ],
    };

    const result = safeParseGrammarModule(raw, { posterContentRules: false });
    expect(result.success).toBe(false);
  });

  it("rejects four-card-grid card without exactly 4 miniCards", () => {
    const raw = {
      moduleTitle: "Test",
      pageLayout: "two-equal-then-full",
      cards: [
        {
          id: 1,
          title: "Card",
          theme: "tangerine",
          layoutType: "four-card-grid",
          miniCards: [{ title: "One", rule: "only one" }],
        },
      ],
    };

    const result = safeParseGrammarModule(raw, { posterContentRules: false });
    expect(result.success).toBe(false);
  });

  it("rejects full-width card missing items", () => {
    const raw = {
      moduleTitle: "Test",
      pageLayout: "four-card-grid-then-split",
      cards: [
        {
          id: 1,
          title: "Card",
          theme: "sky-blue",
          layoutType: "full-width",
        },
      ],
    };

    const result = safeParseGrammarModule(raw, { posterContentRules: false });
    expect(result.success).toBe(false);
  });

  it("accepts item with transformationRow only", () => {
    const raw = {
      moduleTitle: "Test",
      pageLayout: "two-equal",
      cards: [
        {
          id: 1,
          title: "Card",
          theme: "sky-blue",
          layoutType: "three-column",
          items: [
            {
              transformationRow: {
                from: "cat",
                operator: "+",
                suffix: "s",
                to: "cats",
                graphic: "🐱",
                ipa: "/s/",
              },
            },
          ],
        },
      ],
    };

    const result = safeParseGrammarModule(raw, { posterContentRules: false });
    expect(result.success).toBe(true);
  });
});
