import { describe, expect, it } from "vitest";
import { compileUnifiedReactionBody } from "@/lib/story-unified/reaction-body-runtime";

describe("compileUnifiedReactionBody", () => {
  it("maps serial emphasis then trailing phase nav", () => {
    const { sequence, navAfter } = compileUnifiedReactionBody(
      "r1",
      {
        type: "serial",
        children: [
          {
            type: "output",
            leaf: {
              kind: "emphasis",
              target_item_id: "a",
              preset: "grow",
            },
          },
          {
            type: "output",
            leaf: { kind: "nav", nav: { kind: "phase_id", phase_id: "ph2" } },
          },
        ],
      },
      null,
    );
    expect(sequence.steps).toHaveLength(1);
    expect(sequence.steps[0]!.kind).toBe("emphasis");
    expect(sequence.steps[0]!.timing).toBe("simultaneous");
    expect(navAfter).toEqual({ kind: "phase_id", phase_id: "ph2" });
  });

  it("uses tap_chain next_click per direct output child", () => {
    const { sequence } = compileUnifiedReactionBody(
      "tc",
      {
        type: "tap_chain",
        children: [
          {
            type: "output",
            leaf: { kind: "speak", mode: "literal", text: "One" },
          },
          {
            type: "output",
            leaf: { kind: "speak", mode: "literal", text: "Two" },
          },
        ],
      },
      null,
    );
    expect(sequence.steps.map((s) => s.timing)).toEqual(["next_click", "next_click"]);
  });

  it("fills owner on play_sound when omitted on leaf", () => {
    const { sequence } = compileUnifiedReactionBody(
      "own",
      {
        type: "serial",
        children: [
          {
            type: "output",
            leaf: { kind: "play_sound", sound_url: "https://x/s.mp3" },
          },
        ],
      },
      "item9",
    );
    expect(sequence.steps[0]!.target_item_id).toBe("item9");
  });
});
