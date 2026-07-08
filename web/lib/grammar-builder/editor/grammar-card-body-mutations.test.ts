import { describe, expect, it } from "vitest";
import questionsJson from "@/content/grammar/there-is-there-are-poster-a1.json";
import { updateCardComparisonItem } from "./grammar-card-body-mutations";
import { parseGrammarModule } from "../validate-module";

describe("grammar-card-body-mutations", () => {
  const base = parseGrammarModule(questionsJson, { posterContentRules: false });

  it("updates a comparison column item", () => {
    const cardId = base.cards[0]!.id;
    const next = updateCardComparisonItem(base, cardId, "leftColumn", 0, {
      text: "Updated sentence",
      graphic: "⭐️",
    });
    expect(next.cards[0]?.leftColumn?.items[0]?.text).toBe("Updated sentence");
    expect(next.cards[0]?.leftColumn?.items[0]?.graphic).toBe("⭐️");
  });
});
