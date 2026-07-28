import { describe, expect, it } from "vitest";
import {
  canSelectInStrictOrder,
  hintTargetId,
  nextRequiredInOrder,
  phaseComplete,
  resolvePlayPhases,
  responseStackFor,
  type ExploreHotspotsParsed,
} from "./explore-hotspots-play-runtime";

function baseParsed(
  overrides: Partial<ExploreHotspotsParsed> = {},
): ExploreHotspotsParsed {
  return {
    type: "interaction",
    subtype: "explore_hotspots",
    image_url: "/img.png",
    hotspots: [
      {
        id: "a",
        name: "A",
        required: true,
        points: [
          { x: 0, y: 0 },
          { x: 1, y: 0 },
          { x: 1, y: 1 },
        ],
        order_index: 0,
      },
      {
        id: "b",
        name: "B",
        required: true,
        points: [
          { x: 0, y: 0 },
          { x: 1, y: 0 },
          { x: 1, y: 1 },
        ],
        order_index: 1,
      },
    ],
    dialogues: [],
    ...overrides,
  } as ExploreHotspotsParsed;
}

describe("explore-hotspots-play-runtime", () => {
  it("synthesizes a single phase when phases are omitted", () => {
    const phases = resolvePlayPhases(baseParsed());
    expect(phases).toHaveLength(1);
    expect(phases[0]?.hotspot_ids).toEqual(["a", "b"]);
  });

  it("gates strict order to the next incomplete required object", () => {
    const parsed = baseParsed({ strict_order: true });
    const phaseHotspots = parsed.hotspots;
    expect(
      canSelectInStrictOrder(phaseHotspots[1]!, phaseHotspots, {}, true),
    ).toBe(false);
    expect(
      canSelectInStrictOrder(
        phaseHotspots[1]!,
        phaseHotspots,
        { a: "completed" },
        true,
      ),
    ).toBe(true);
    expect(nextRequiredInOrder(phaseHotspots, { a: "completed" })?.id).toBe("b");
  });

  it("builds dialogue fallback response stack", () => {
    const stack = responseStackFor(baseParsed().hotspots[0]!);
    expect(stack[0]?.kind).toBe("dialogue");
  });

  it("returns empty stack for silent sprites", () => {
    const stack = responseStackFor({
      ...baseParsed().hotspots[0]!,
      interaction_kind: "silent",
      presentation: "sprite",
    });
    expect(stack).toHaveLength(0);
  });

  it("reports phase complete and hint target", () => {
    const hotspots = baseParsed().hotspots;
    expect(phaseComplete(hotspots, { a: "completed", b: "discovered" })).toBe(
      true,
    );
    expect(hintTargetId(hotspots, { a: "available" }, true)).toBe("a");
    expect(hintTargetId(hotspots, { a: "completed" }, true)).toBe("b");
  });
});
