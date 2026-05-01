import { describe, expect, it } from "vitest";
import { resolveStoryIdleForItem } from "@/lib/story-idle";
import type { NormalizedStoryPage, StoryItem } from "@/lib/lesson-schemas";

const baseItem = (id: string): StoryItem => ({
  id,
  kind: "image",
  x_percent: 0,
  y_percent: 0,
  w_percent: 10,
  h_percent: 10,
  image_url: "https://example.com/x.png",
  show_card: true,
  show_on_start: true,
  image_scale: 1,
  z_index: 0,
});

function pageBase(
  partial: Pick<NormalizedStoryPage, "items" | "phases" | "idle_animations" | "phasesExplicit">,
): Pick<
  NormalizedStoryPage,
  "items" | "phases" | "idle_animations" | "phasesExplicit"
> {
  return partial;
}

describe("resolveStoryIdleForItem", () => {
  it("prefers item idle over page idle", () => {
    const item = {
      ...baseItem("a"),
      idle_animations: [
        { id: "i1", preset: "pulse" as const, name: "item pulse" },
      ],
    };
    const page = pageBase({
      items: [item],
      phases: [{ id: "ph0", is_start: true, next_phase_id: null }],
      phasesExplicit: true,
      idle_animations: [
        {
          id: "g1",
          preset: "breathe",
          target_item_id: "a",
        },
      ],
    });
    const r = resolveStoryIdleForItem(item, page, "ph0");
    expect(r?.id).toBe("i1");
  });

  it("uses page idle when item has none (non-explicit phases)", () => {
    const item = baseItem("a");
    const page = pageBase({
      items: [item],
      phases: [{ id: "__legacy", is_start: true, next_phase_id: null }],
      phasesExplicit: false,
      idle_animations: [
        {
          id: "g1",
          preset: "gentle_float",
          target_item_id: "a",
        },
      ],
    });
    const r = resolveStoryIdleForItem(item, page, null);
    expect(r?.preset).toBe("gentle_float");
  });

  it("filters by active_phase_ids when page has phases", () => {
    const item = {
      ...baseItem("a"),
      idle_animations: [
        {
          id: "x",
          preset: "wobble_loop" as const,
          active_phase_ids: ["ph2"],
        },
      ],
    };
    const page = pageBase({
      items: [item],
      phases: [
        { id: "ph1", name: "1", is_start: true, next_phase_id: "ph2" },
        { id: "ph2", name: "2", is_start: false, next_phase_id: null },
      ],
      phasesExplicit: true,
      idle_animations: [],
    });
    expect(resolveStoryIdleForItem(item, page, "ph1")).toBeNull();
    expect(resolveStoryIdleForItem(item, page, "ph2")?.id).toBe("x");
  });

  it("uses phase-scoped idle targeting the item", () => {
    const item = baseItem("a");
    const page = pageBase({
      items: [item],
      phases: [
        {
          id: "ph1",
          is_start: true,
          next_phase_id: null,
          idle_animations: [
            { id: "q", preset: "spin_loop" as const, target_item_id: "a" },
          ],
        },
      ],
      phasesExplicit: true,
      idle_animations: [],
    });
    const r = resolveStoryIdleForItem(item, page, "ph1");
    expect(r?.id).toBe("q");
  });

  it("item idle beats phase idle", () => {
    const item = {
      ...baseItem("a"),
      idle_animations: [{ id: "i", preset: "breathe" as const }],
    };
    const page = pageBase({
      items: [item],
      phases: [
        {
          id: "ph1",
          is_start: true,
          next_phase_id: null,
          idle_animations: [
            { id: "q", preset: "spin_loop" as const, target_item_id: "a" },
          ],
        },
      ],
      phasesExplicit: true,
      idle_animations: [],
    });
    expect(resolveStoryIdleForItem(item, page, "ph1")?.id).toBe("i");
  });
});
