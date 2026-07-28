import { describe, expect, it } from "vitest";
import {
  canSelectInStrictOrder,
  hintTargetId,
  nextRequiredInOrder,
  phaseComplete,
  resolvePhasePlayback,
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

  it("returns an audio fallback card for audio interaction", () => {
    const stack = responseStackFor({
      ...baseParsed().hotspots[0]!,
      interaction_kind: "audio",
      presentation: "sprite",
    });
    expect(stack).toHaveLength(1);
    expect(stack[0]?.kind).toBe("audio");
  });

  it("reports phase complete and hint target", () => {
    const hotspots = baseParsed().hotspots;
    expect(phaseComplete(hotspots, { a: "completed", b: "discovered" })).toBe(
      true,
    );
    expect(hintTargetId(hotspots, { a: "available" }, true)).toBe("a");
    expect(hintTargetId(hotspots, { a: "completed" }, true)).toBe("b");
  });

  it("treats decorative objects as complete without a visit", () => {
    const hotspots = [
      {
        ...baseParsed().hotspots[0]!,
        id: "prop",
        required: true,
        interaction_kind: "none" as const,
      },
      baseParsed().hotspots[1]!,
    ];
    expect(phaseComplete(hotspots, { b: "available" })).toBe(false);
    expect(phaseComplete(hotspots, { b: "completed" })).toBe(true);
    expect(nextRequiredInOrder(hotspots, {})?.id).toBe("b");
  });

  it("resolves scene playback with activity fallback", () => {
    const activity = baseParsed({
      strict_order: true,
      hint_pulse_enabled: false,
      auto_play_on_select: true,
      objective: { label: "Activity goal" },
      visited_when: "dialogue_started",
    });
    const phase = {
      id: "p1",
      image_url: "/a.png",
      hotspot_ids: ["a"],
      strict_order: false,
      objective: { label: "Scene goal" },
    };
    const settings = resolvePhasePlayback(phase, activity);
    expect(settings.strictOrder).toBe(false);
    expect(settings.objectiveLabel).toBe("Scene goal");
    expect(settings.hintPulseEnabled).toBe(false);
    expect(settings.autoPlayOnSelect).toBe(true);
    expect(settings.visitedWhen).toBe("dialogue_started");
  });
});
