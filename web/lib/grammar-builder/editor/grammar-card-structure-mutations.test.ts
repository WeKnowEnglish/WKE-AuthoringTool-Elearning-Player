import { describe, expect, it } from "vitest";
import questionsJson from "@/content/grammar/there-is-there-are-poster-a1.json";
import {
  addCard,
  canAddCard,
  removeCard,
} from "./grammar-card-structure-mutations";
import { parseGrammarModule } from "../validate-module";

describe("grammar-card-structure-mutations", () => {
  const base = parseGrammarModule(questionsJson, { posterContentRules: false });

  it("adds a card with a new id", () => {
    const module = { ...base, difficulty: undefined };
    const next = addCard(module);
    expect(next.cards).toHaveLength(module.cards.length + 1);
    expect(next.cards.at(-1)?.id).toBe(4);
    expect(next.cards.at(-1)?.layoutType).toBe("two-equal");
  });

  it("removes a card and prunes interactions", () => {
    const withInteraction = {
      ...base,
      interactions: [
        {
          id: "reveal-card1",
          target: { cardId: 1, region: "leftColumn" as const, itemIndex: 0 },
          trigger: "tap" as const,
          action: "reveal" as const,
          payload: { text: "Hi" },
        },
      ],
    };
    const next = removeCard(withInteraction, 1);
    expect(next.cards.some((card) => card.id === 1)).toBe(false);
    expect(next.interactions).toHaveLength(0);
  });

  it("respects A1 card limit", () => {
    const a1 = { ...base, difficulty: "A1" as const };
    let module = a1;
    while (canAddCard(module)) {
      module = addCard(module);
    }
    expect(module.cards).toHaveLength(3);
    expect(addCard(module)).toBe(module);
  });
});
