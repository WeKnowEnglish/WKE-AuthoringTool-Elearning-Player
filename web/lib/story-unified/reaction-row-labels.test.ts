import { describe, expect, it } from "vitest";
import {
  reactionTriggerLabel,
  summarizeReactionBody,
} from "@/lib/story-unified/reaction-row-labels";
import type { StoryUnifiedReactionRow } from "@/lib/story-unified/schema";

describe("reaction-row-labels", () => {
  it("labels timer trigger with phase name and seconds", () => {
    const row: StoryUnifiedReactionRow = {
      phase_id: "ph_intro",
      trigger: "timer",
      timer_delay_ms: 1500,
      reaction_body: { type: "serial", children: [] },
    };
    const text = reactionTriggerLabel(
      row,
      { phaseNameById: new Map([["ph_intro", "Intro"]]) },
    );
    expect(text).toBe("Timer 1.5s · Intro");
  });

  it("labels item click with item + phase names", () => {
    const row: StoryUnifiedReactionRow = {
      phase_id: "ph1",
      owner_item_id: "shirt",
      trigger: "item_click",
      reaction_body: { type: "serial", children: [] },
    };
    const text = reactionTriggerLabel(row, {
      phaseNameById: new Map([["ph1", "Warmup"]]),
      itemNameById: new Map([["shirt", "Blue shirt"]]),
    });
    expect(text).toBe("Tap · Blue shirt · Warmup");
  });

  it("summarizes leaves and truncates", () => {
    const summary = summarizeReactionBody(
      {
        type: "serial",
        children: [
          { type: "output", leaf: { kind: "emphasis", target_item_id: "a" } },
          { type: "output", leaf: { kind: "play_sound", sound_url: "https://x" } },
          { type: "output", leaf: { kind: "speak", mode: "literal", text: "Hi" } },
          { type: "output", leaf: { kind: "info_popup" } },
          { type: "output", leaf: { kind: "nav", nav: { kind: "next_phase" } } },
        ],
      },
      { maxLeaves: 4 },
    );
    expect(summary).toBe("Emphasis -> Play sound -> Speak -> Info popup -> +1 more");
  });
});
