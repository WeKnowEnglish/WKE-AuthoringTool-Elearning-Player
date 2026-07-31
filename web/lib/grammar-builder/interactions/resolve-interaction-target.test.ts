import { describe, expect, it } from "vitest";
import {
  buildInteractionTarget,
  indexInteractionsByTarget,
  interactionTargetKey,
} from "./resolve-interaction-target";
import type { GrammarInteraction } from "../schema";

describe("resolve-interaction-target", () => {
  it("builds stable target keys", () => {
    expect(interactionTargetKey(buildInteractionTarget(1, "leftColumn", 0))).toBe(
      "1:leftColumn:0",
    );
    expect(interactionTargetKey(buildInteractionTarget(3, "banner"))).toBe("3:banner");
    expect(
      interactionTargetKey(
        buildInteractionTarget(5, "summaryCell", undefined, { rowIndex: 1, colIndex: 0 }),
      ),
    ).toBe("5:summaryCell:r1:c0");
  });

  it("indexes interactions by target", () => {
    const interactions: GrammarInteraction[] = [
      {
        id: "reveal-card1-left-0",
        target: { cardId: 1, region: "leftColumn", itemIndex: 0 },
        trigger: "tap",
        action: "reveal",
        payload: { text: "Example reveal", label: "Hint" },
      },
      {
        id: "highlight-card3-banner",
        target: { cardId: 3, region: "banner" },
        trigger: "tap",
        action: "highlight",
        payload: { durationMs: 1200 },
      },
    ];
    const map = indexInteractionsByTarget(interactions);
    expect(map.get("1:leftColumn:0")?.[0]?.action).toBe("reveal");
    expect(map.get("3:banner")?.[0]?.action).toBe("highlight");
  });
});
