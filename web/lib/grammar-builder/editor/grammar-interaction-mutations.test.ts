import { describe, expect, it } from "vitest";
import questionsJson from "@/content/grammar/there-is-there-are-poster-a1.json";
import { addInteraction, createInteractionId, removeInteraction } from "./grammar-interaction-mutations";
import { buildInteractionTarget } from "../interactions/resolve-interaction-target";
import { parseGrammarModule } from "../validate-module";

describe("grammar-interaction-mutations", () => {
  const base = parseGrammarModule(questionsJson, { posterContentRules: false });

  it("adds and removes interactions", () => {
    const id = createInteractionId(base, 2, "reveal");
    const withInteraction = addInteraction(base, {
      id,
      target: buildInteractionTarget(2, "rightColumn", 0),
      trigger: "tap",
      action: "reveal",
      payload: { text: "Test reveal" },
    });
    expect(withInteraction.interactions?.some((item) => item.id === id)).toBe(true);

    const removed = removeInteraction(withInteraction, id);
    expect(removed.interactions?.some((item) => item.id === id)).toBe(false);
  });
});
