import { describe, expect, it } from "vitest";
import questionsJson from "@/content/grammar/there-is-there-are-poster-a1.json";
import {
  updateCardGlanceRule,
  updateCardTheme,
  updateModulePageLayout,
} from "./grammar-module-mutations";
import { parseGrammarModule } from "../validate-module";

describe("grammar-module-mutations", () => {
  const base = parseGrammarModule(questionsJson, { posterContentRules: false });

  it("updates page layout", () => {
    const next = updateModulePageLayout(base, "two-equal");
    expect(next.pageLayout).toBe("two-equal");
    expect(next.cards).toEqual(base.cards);
  });

  it("updates card theme by id", () => {
    const next = updateCardTheme(base, 2, "mint-green");
    expect(next.cards.find((card) => card.id === 2)?.theme).toBe("mint-green");
    expect(next.cards.find((card) => card.id === 1)?.theme).toBe(base.cards[0]?.theme);
  });

  it("updates nested glance rule fields", () => {
    const next = updateCardGlanceRule(base, 1, {
      text: "New rule",
      highlight: "rule",
    });
    expect(next.cards[0]?.glanceRule).toEqual({
      text: "New rule",
      highlight: "rule",
    });
  });
});
