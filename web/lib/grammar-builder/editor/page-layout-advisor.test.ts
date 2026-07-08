import { describe, expect, it } from "vitest";
import questionsJson from "@/content/grammar/there-is-there-are-poster-a1.json";
import { advisePageLayout } from "./page-layout-advisor";
import { derivePresetPageRows } from "../poster-page-layout";
import { parseGrammarModule } from "../validate-module";

describe("page-layout-advisor", () => {
  it("warns when two-equal-then-full has fewer than three cards", () => {
    const module = parseGrammarModule(questionsJson, { posterContentRules: false });
    const twoCardModule = { ...module, cards: module.cards.slice(0, 2) };
    const advice = advisePageLayout(twoCardModule);
    expect(advice.some((item) => item.severity === "warn")).toBe(true);
  });
});

describe("derivePresetPageRows", () => {
  it("matches two-equal-then-full shape for three cards", () => {
    expect(derivePresetPageRows("two-equal-then-full", [1, 2, 3])).toEqual([
      { columns: 2, cardIds: [1, 2] },
      { columns: 1, cardIds: [3] },
    ]);
  });

  it("matches two-by-two-then-full shape for five cards", () => {
    expect(derivePresetPageRows("two-by-two-then-full", [1, 2, 3, 4, 5])).toEqual([
      { columns: 2, cardIds: [1, 2] },
      { columns: 2, cardIds: [3, 4] },
      { columns: 1, cardIds: [5] },
    ]);
  });
});
