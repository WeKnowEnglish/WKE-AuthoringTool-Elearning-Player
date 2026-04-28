import { describe, expect, it } from "vitest";
import {
  getNormalizedStoryPages,
  getOnEnterRuntimeActions,
  getResolvedPhaseTransition,
  remapStoryPayloadIds,
  storyPayloadSchema,
} from "@/lib/lesson-schemas";

describe("storyPayloadSchema", () => {
  it("accepts legacy flat story", () => {
    const p = storyPayloadSchema.parse({
      type: "story",
      body_text: "Hello",
      image_url: "https://example.com/a.png",
    });
    expect(p.body_text).toBe("Hello");
    expect(p.pages).toBeUndefined();
  });

  it("accepts multi-page payload", () => {
    const p = storyPayloadSchema.parse({
      type: "story",
      body_text: "Root",
      pages: [
        {
          id: "p1",
          body_text: "Page one",
          items: [
            {
              id: "i1",
              image_url: "https://example.com/i.png",
              x_percent: 10,
              y_percent: 10,
              w_percent: 20,
              h_percent: 15,
              enter: { preset: "fade_in", duration_ms: 400 },
            },
          ],
        },
      ],
      page_turn_style: "slide",
    });
    expect(p.pages).toHaveLength(1);
    expect(p.pages?.[0].items[0].id).toBe("i1");
    expect(p.pages?.[0].items[0].show_card).toBe(true);
    expect(p.pages?.[0].items[0].image_scale).toBe(1);
  });

  it("accepts explicit image_scale value", () => {
    const p = storyPayloadSchema.parse({
      type: "story",
      body_text: "a",
      pages: [
        {
          id: "p1",
          body_text: "b",
          items: [
            {
              id: "i1",
              image_url: "https://x",
              x_percent: 0,
              y_percent: 0,
              w_percent: 10,
              h_percent: 10,
              image_scale: 1.35,
            },
          ],
        },
      ],
    });
    const it = p.pages![0].items[0];
    expect(it.image_scale).toBe(1.35);
  });

  it("rejects duplicate item ids on a page", () => {
    const r = storyPayloadSchema.safeParse({
      type: "story",
      body_text: "x",
      pages: [
        {
          id: "p1",
          items: [
            {
              id: "same",
              image_url: "https://a",
              x_percent: 0,
              y_percent: 0,
              w_percent: 10,
              h_percent: 10,
            },
            {
              id: "same",
              image_url: "https://b",
              x_percent: 1,
              y_percent: 1,
              w_percent: 10,
              h_percent: 10,
            },
          ],
        },
      ],
    });
    expect(r.success).toBe(false);
  });
});

describe("getNormalizedStoryPages", () => {
  it("maps legacy to one synthetic page", () => {
    const p = storyPayloadSchema.parse({
      type: "story",
      body_text: "Legacy text",
      image_url: "https://bg.png",
    });
    const pages = getNormalizedStoryPages(p);
    expect(pages).toHaveLength(1);
    expect(pages[0].id).toBe("legacy");
    expect(pages[0].body_text).toBe("Legacy text");
    expect(pages[0].background_image_url).toBe("https://bg.png");
    expect(pages[0].phasesExplicit).toBe(false);
  });

  it("includes explicit phases on a page", () => {
    const p = storyPayloadSchema.parse({
      type: "story",
      body_text: "Root",
      pages: [
        {
          id: "p1",
          body_text: "Hi",
          items: [],
          phases: [
            {
              id: "a",
              name: "One",
              is_start: true,
              next_phase_id: "b",
            },
            {
              id: "b",
              name: "Two",
              is_start: false,
              next_phase_id: null,
            },
          ],
        },
      ],
    });
    const pages = getNormalizedStoryPages(p);
    expect(pages[0].phasesExplicit).toBe(true);
    expect(pages[0].phases).toHaveLength(2);
  });

  it("normalizes auto_play_page_text to false when omitted", () => {
    const p = storyPayloadSchema.parse({
      type: "story",
      body_text: "Root",
      pages: [
        {
          id: "p1",
          body_text: "Hi",
          items: [],
        },
      ],
    });
    const pages = getNormalizedStoryPages(p);
    expect(pages[0].auto_play_page_text).toBe(false);
  });

  it("accepts Phase 2 fields when item and phase ids line up", () => {
    const p = storyPayloadSchema.parse({
      type: "story",
      body_text: "Root",
      pages: [
        {
          id: "p1",
          body_text: "Hi",
          items: [
            {
              id: "item-tap",
              image_url: "https://i",
              x_percent: 0,
              y_percent: 0,
              w_percent: 10,
              h_percent: 10,
            },
            {
              id: "item-hi",
              image_url: "https://j",
              x_percent: 10,
              y_percent: 0,
              w_percent: 10,
              h_percent: 10,
            },
          ],
          phases: [
            {
              id: "a",
              is_start: true,
              kind: "click_to_advance",
              on_enter: [{ action: "show_item", item_ids: ["item-hi"] }],
              dialogue: { start: "Try the button." },
              highlight_item_ids: ["item-tap"],
              completion: {
                type: "on_click",
                target_item_id: "item-tap",
                next_phase_id: "b",
              },
            },
            {
              id: "b",
              is_start: false,
              completion: { type: "end_phase" },
            },
          ],
        },
      ],
    });
    const ph0 = p.pages?.[0].phases?.[0];
    expect(ph0?.completion?.type).toBe("on_click");
    expect(getResolvedPhaseTransition(ph0!)?.type).toBe("on_click");
  });

  it("allows on_enter play_sound without sound_url (authoring draft; runtime is no-op)", () => {
    const p = storyPayloadSchema.parse({
      type: "story",
      body_text: "Root",
      pages: [
        {
          id: "p1",
          body_text: "Hi",
          items: [
            {
              id: "a",
              image_url: "https://i",
              x_percent: 0,
              y_percent: 0,
              w_percent: 10,
              h_percent: 10,
            },
          ],
          phases: [
            {
              id: "p1a",
              is_start: true,
              on_enter: [{ action: "play_sound" }],
              completion: { type: "end_phase" },
            },
          ],
        },
      ],
    });
    expect(p.pages?.[0].phases?.[0].on_enter?.[0].action).toBe("play_sound");
  });

  it("accepts optional request_line on draggable and non-draggable items", () => {
    const p = storyPayloadSchema.parse({
      type: "story",
      body_text: "Snack time",
      pages: [
        {
          id: "pg1",
          body_text: "Sort",
          items: [
            {
              id: "chip",
              name: "Chips",
              request_line: "I want chips!",
              image_url: "https://x",
              x_percent: 0,
              y_percent: 0,
              w_percent: 10,
              h_percent: 10,
            },
            {
              id: "student",
              name: "Student 1",
              request_line: "I want chips!",
              image_url: "https://y",
              x_percent: 20,
              y_percent: 0,
              w_percent: 10,
              h_percent: 10,
            },
            {
              id: "table",
              name: "Table",
              image_url: "https://z",
              x_percent: 40,
              y_percent: 0,
              w_percent: 10,
              h_percent: 10,
            },
          ],
          phases: [
            {
              id: "ph1",
              is_start: true,
              kind: "drag_match",
              next_phase_id: "ph2",
              completion: { type: "all_matched", next_phase_id: "ph2" },
              drag_match: {
                draggable_item_ids: ["chip"],
                target_item_ids: ["student"],
                correct_map: { chip: "student" },
              },
            },
            { id: "ph2", is_start: false, completion: { type: "end_phase" } },
          ],
        },
      ],
    });
    const draggable = p.pages?.[0].items.find((i) => i.id === "chip");
    const nonDraggable = p.pages?.[0].items.find((i) => i.id === "student");
    const silent = p.pages?.[0].items.find((i) => i.id === "table");
    expect(draggable?.request_line).toContain("chips");
    expect(nonDraggable?.request_line).toContain("chips");
    expect(silent?.request_line).toBeUndefined();
    expect(p.pages?.[0].phases?.[0].kind).toBe("drag_match");
    expect(p.pages?.[0].phases?.[0].drag_match?.after_correct_match).toBe(
      "return_home",
    );
  });

  it("accepts tap_speeches with phase mapping and play limits", () => {
    const p = storyPayloadSchema.parse({
      type: "story",
      body_text: "Tap flow",
      pages: [
        {
          id: "pg1",
          items: [
            {
              id: "obj",
              image_url: "https://x",
              x_percent: 0,
              y_percent: 0,
              w_percent: 10,
              h_percent: 10,
              tap_speeches: [
                {
                  id: "e1",
                  priority: 1,
                  phase_ids: ["ph1"],
                  text: "Hello",
                  max_plays: 2,
                },
                {
                  id: "e2",
                  priority: 100,
                  sound_url: "https://audio.example.com/hello.mp3",
                },
              ],
            },
          ],
          phases: [
            { id: "ph1", is_start: true, completion: { type: "end_phase" } },
            { id: "ph2", is_start: false, completion: { type: "end_phase" } },
          ],
        },
      ],
    });
    expect(p.pages?.[0].items[0].tap_speeches?.[0].max_plays).toBe(2);
  });

  it("rejects tap_speeches with unknown phase ids", () => {
    const r = storyPayloadSchema.safeParse({
      type: "story",
      body_text: "Tap flow",
      pages: [
        {
          id: "pg1",
          items: [
            {
              id: "obj",
              image_url: "https://x",
              x_percent: 0,
              y_percent: 0,
              w_percent: 10,
              h_percent: 10,
              tap_speeches: [
                {
                  id: "e1",
                  priority: 1,
                  phase_ids: ["missing"],
                  text: "Hello",
                },
              ],
            },
          ],
          phases: [{ id: "ph1", is_start: true, completion: { type: "end_phase" } }],
        },
      ],
    });
    expect(r.success).toBe(false);
  });

  it("allows draft tap_speeches entries without text/sound during authoring", () => {
    const r = storyPayloadSchema.safeParse({
      type: "story",
      body_text: "Tap flow",
      pages: [
        {
          id: "pg1",
          items: [
            {
              id: "obj",
              image_url: "https://x",
              x_percent: 0,
              y_percent: 0,
              w_percent: 10,
              h_percent: 10,
              tap_speeches: [{ id: "e1", priority: 1 }],
            },
          ],
        },
      ],
    });
    expect(r.success).toBe(true);
  });
});

describe("remapStoryPayloadIds", () => {
  it("assigns new page and item ids", () => {
    const p = storyPayloadSchema.parse({
      type: "story",
      body_text: "a",
      pages: [
        {
          id: "old-page",
          items: [
            {
              id: "old-item",
              image_url: "https://i",
              x_percent: 0,
              y_percent: 0,
              w_percent: 10,
              h_percent: 10,
            },
          ],
          phases: [
            {
              id: "ph1",
              is_start: true,
              next_phase_id: "ph2",
            },
            {
              id: "ph2",
              is_start: false,
              next_phase_id: null,
              advance_on_item_tap_id: "old-item",
            },
          ],
        },
      ],
    });
    const next = remapStoryPayloadIds(p);
    expect(next.pages?.[0].id).not.toBe("old-page");
    expect(next.pages?.[0].items[0].id).not.toBe("old-item");
    const ph0 = next.pages?.[0].phases?.[0];
    const ph1 = next.pages?.[0].phases?.[1];
    expect(ph0?.id).not.toBe("ph1");
    expect(ph1?.id).not.toBe("ph2");
    expect(ph0?.next_phase_id).toBe(ph1?.id);
    expect(ph1?.advance_on_item_tap_id).toBe(next.pages?.[0].items[0].id);
  });

  it("remap keeps drag_match.after_correct_match", () => {
    const p = storyPayloadSchema.parse({
      type: "story",
      body_text: "a",
      pages: [
        {
          id: "pg1",
          items: [
            {
              id: "a1",
              image_url: "https://i",
              x_percent: 0,
              y_percent: 0,
              w_percent: 10,
              h_percent: 10,
            },
            {
              id: "a2",
              image_url: "https://j",
              x_percent: 10,
              y_percent: 0,
              w_percent: 10,
              h_percent: 10,
            },
          ],
          phases: [
            {
              id: "ph1",
              is_start: true,
              next_phase_id: "ph2",
              kind: "drag_match" as const,
              completion: { type: "all_matched" as const, next_phase_id: "ph2" },
              drag_match: {
                draggable_item_ids: ["a1"],
                target_item_ids: ["a2"],
                correct_map: { a1: "a2" },
                after_correct_match: "stick_on_target" as const,
              },
            },
            { id: "ph2", is_start: false, completion: { type: "end_phase" } },
          ],
        },
      ],
    });
    const next = remapStoryPayloadIds(p);
    expect(
      next.pages?.[0].phases?.[0].drag_match?.after_correct_match,
    ).toBe("stick_on_target");
  });

  it("remaps tap_speeches phase_ids when phase ids change", () => {
    const p = storyPayloadSchema.parse({
      type: "story",
      body_text: "a",
      pages: [
        {
          id: "pg1",
          items: [
            {
              id: "item1",
              image_url: "https://i",
              x_percent: 0,
              y_percent: 0,
              w_percent: 10,
              h_percent: 10,
              tap_speeches: [
                { id: "entry1", priority: 1, phase_ids: ["ph1"], text: "A" },
              ],
            },
          ],
          phases: [
            { id: "ph1", is_start: true, next_phase_id: "ph2" },
            { id: "ph2", is_start: false, next_phase_id: null },
          ],
        },
      ],
    });
    const next = remapStoryPayloadIds(p);
    expect(next.pages?.[0].phases?.[0].id).not.toBe("ph1");
    expect(next.pages?.[0].items[0].tap_speeches?.[0].phase_ids?.[0]).toBe(
      next.pages?.[0].phases?.[0].id,
    );
  });
});

describe("getResolvedPhaseTransition", () => {
  it("on_click: target from completion; next prefers top-level next_phase_id", () => {
    const r = getResolvedPhaseTransition({
      id: "a",
      is_start: true,
      next_phase_id: "b",
      advance_on_item_tap_id: "old",
      completion: {
        type: "on_click",
        target_item_id: "new",
        next_phase_id: "c",
      },
    });
    expect(r?.type).toBe("on_click");
    if (r?.type === "on_click") {
      expect(r.target_item_id).toBe("new");
      expect(r.next_phase_id).toBe("b");
    }
  });

  it("on_click: falls back to completion next when top-level next_phase_id is null", () => {
    const r = getResolvedPhaseTransition({
      id: "a",
      is_start: true,
      next_phase_id: null,
      completion: {
        type: "on_click",
        target_item_id: "x",
        next_phase_id: "y",
      },
    });
    expect(r?.type).toBe("on_click");
    if (r?.type === "on_click") {
      expect(r.next_phase_id).toBe("y");
    }
  });

  it("maps legacy advance + next to on_click", () => {
    const r = getResolvedPhaseTransition({
      id: "a",
      is_start: true,
      next_phase_id: "b",
      advance_on_item_tap_id: "x",
    });
    expect(r?.type).toBe("on_click");
    if (r?.type === "on_click") {
      expect(r.target_item_id).toBe("x");
      expect(r.next_phase_id).toBe("b");
    }
  });

  it("all_matched: next from top-level or completion", () => {
    const r1 = getResolvedPhaseTransition({
      id: "a",
      is_start: true,
      next_phase_id: "b",
      completion: { type: "all_matched", next_phase_id: "c" },
    });
    expect(r1?.type).toBe("all_matched");
    if (r1?.type === "all_matched") {
      expect(r1.next_phase_id).toBe("b");
    }
    const r2 = getResolvedPhaseTransition({
      id: "a",
      is_start: true,
      next_phase_id: null,
      completion: { type: "all_matched", next_phase_id: "c" },
    });
    if (r2?.type === "all_matched") {
      expect(r2.next_phase_id).toBe("c");
    }
  });
});

describe("getOnEnterRuntimeActions", () => {
  it("fans out show_item to each id", () => {
    const a = getOnEnterRuntimeActions({
      action: "show_item",
      item_ids: ["a", "b"],
    });
    expect(a).toEqual([
      { action: "show_item", item_id: "a" },
      { action: "show_item", item_id: "b" },
    ]);
  });
});

describe("remapStoryPayloadIds (continued)", () => {
  it("is noop when no pages", () => {
    const p = storyPayloadSchema.parse({
      type: "story",
      body_text: "only",
    });
    expect(remapStoryPayloadIds(p)).toEqual(p);
  });
});
