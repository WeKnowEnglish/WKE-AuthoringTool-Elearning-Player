import { describe, expect, it } from "vitest";
import { resolveExplorePresentation } from "@/lib/explore/resolve-explore-presentation";
import type { ExplorePayload } from "@/lib/lesson-schemas";

const sample: ExplorePayload = {
  type: "interaction",
  subtype: "explore",
  gates: [
    { id: "g1", prompt: "Spell", target_word: "run" },
    { id: "g2", prompt: "Spell", target_word: "jump" },
    { id: "g3", prompt: "Spell", target_word: "fast" },
  ],
  encounter: {
    title: "Bonus",
    choices: [
      { id: "a", label: "A", gold_bonus: 5 },
      { id: "b", label: "B", gold_bonus: 10 },
    ],
  },
};

describe("resolveExplorePresentation", () => {
  it("uses default template when omitted", () => {
    const p = resolveExplorePresentation(sample);
    expect(p.templateId).toBe("default_run_v1");
    expect(p.gateScenes).toHaveLength(3);
    expect(p.gateScenes[0]!.obstacleKind).toBe("spike");
    expect(p.gateScenes[1]!.obstacleKind).toBe("lava");
  });

  it("merges gate scene image overrides", () => {
    const p = resolveExplorePresentation({
      ...sample,
      background_url: "https://example.com/run.png",
      gates: [
        { ...sample.gates[0]!, scene_image_url: "https://example.com/gate1.png" },
        sample.gates[1]!,
        sample.gates[2]!,
      ],
    });
    expect(p.runBackgroundUrl).toBe("https://example.com/run.png");
    expect(p.gateScenes[0]!.sceneBackgroundUrl).toBe("https://example.com/gate1.png");
    expect(p.gateScenes[1]!.sceneBackgroundUrl).toBe("https://example.com/run.png");
  });
});
