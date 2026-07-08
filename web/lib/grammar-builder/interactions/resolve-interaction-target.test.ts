import { describe, expect, it } from "vitest";
import questionsJson from "@/content/grammar/there-is-there-are-poster-a1.json";
import {
  buildInteractionTarget,
  indexInteractionsByTarget,
  interactionTargetKey,
} from "./resolve-interaction-target";
import { parseGrammarModule } from "../validate-module";

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
    const module = parseGrammarModule(questionsJson, { posterContentRules: false });
    const map = indexInteractionsByTarget(module.interactions);
    expect(map.get("1:leftColumn:0")?.[0]?.action).toBe("reveal");
    expect(map.get("3:banner")?.[0]?.action).toBe("highlight");
  });
});
