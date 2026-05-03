import { describe, expect, it } from "vitest";
import {
  getNormalizedStoryPages,
  getOnEnterRuntimeActions,
  getResolvedPhaseTransition,
  remapStoryPayloadIds,
  storyPageSchema,
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

  it("accepts cast + image item with registry_id when cast provides default image_url", () => {
    const p = storyPayloadSchema.parse({
      type: "story",
      body_text: "x",
      cast: [{ id: "c1", role: "character", image_url: "https://hero.png" }],
      pages: [
        {
          id: "p1",
          body_text: "p",
          items: [
            {
              id: "i1",
              registry_id: "c1",
              x_percent: 0,
              y_percent: 0,
              w_percent: 10,
              h_percent: 10,
              enter: { preset: "fade_in", duration_ms: 400 },
            },
          ],
        },
      ],
    });
    expect(p.cast?.[0].id).toBe("c1");
    expect(p.pages?.[0].items[0].registry_id).toBe("c1");
  });

  it("rejects registry_id not listed in cast", () => {
    const r = storyPayloadSchema.safeParse({
      type: "story",
      body_text: "x",
      cast: [{ id: "c1", role: "character", image_url: "https://a.png" }],
      pages: [
        {
          id: "p1",
          body_text: "p",
          items: [
            {
              id: "i1",
              registry_id: "missing",
              x_percent: 0,
              y_percent: 0,
              w_percent: 10,
              h_percent: 10,
              enter: { preset: "fade_in", duration_ms: 400 },
            },
          ],
        },
      ],
    });
    expect(r.success).toBe(false);
  });

  it("rejects duplicate cast entry ids", () => {
    const r = storyPayloadSchema.safeParse({
      type: "story",
      body_text: "x",
      cast: [
        { id: "same", role: "character", image_url: "https://a.png" },
        { id: "same", role: "prop", image_url: "https://b.png" },
      ],
      pages: [
        {
          id: "p1",
          body_text: "p",
          items: [
            {
              id: "i1",
              image_url: "https://i.png",
              x_percent: 0,
              y_percent: 0,
              w_percent: 10,
              h_percent: 10,
              enter: { preset: "fade_in", duration_ms: 400 },
            },
          ],
        },
      ],
    });
    expect(r.success).toBe(false);
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

  it("rejects page idle without target_item_id", () => {
    const r = storyPayloadSchema.safeParse({
      type: "story",
      body_text: "x",
      pages: [
        {
          id: "p1",
          items: [
            {
              id: "i1",
              image_url: "https://a",
              x_percent: 0,
              y_percent: 0,
              w_percent: 10,
              h_percent: 10,
            },
          ],
          idle_animations: [{ id: "id1", preset: "pulse" }],
        },
      ],
    });
    expect(r.success).toBe(false);
  });

  it("rejects item idle with target_item_id", () => {
    const r = storyPayloadSchema.safeParse({
      type: "story",
      body_text: "x",
      pages: [
        {
          id: "p1",
          items: [
            {
              id: "i1",
              image_url: "https://a",
              x_percent: 0,
              y_percent: 0,
              w_percent: 10,
              h_percent: 10,
              idle_animations: [
                {
                  id: "id1",
                  preset: "pulse",
                  target_item_id: "i1",
                },
              ],
            },
          ],
          phases: [
            { id: "a", is_start: true, next_phase_id: null },
          ],
        },
      ],
    });
    expect(r.success).toBe(false);
  });

  it("accepts page idle with valid target_item_id", () => {
    const r = storyPayloadSchema.safeParse({
      type: "story",
      body_text: "x",
      pages: [
        {
          id: "p1",
          items: [
            {
              id: "i1",
              image_url: "https://a",
              x_percent: 0,
              y_percent: 0,
              w_percent: 10,
              h_percent: 10,
            },
          ],
          idle_animations: [
            { id: "id1", preset: "gentle_float", target_item_id: "i1" },
          ],
        },
      ],
    });
    expect(r.success).toBe(true);
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

  it("merges cast default image_url into normalized image items", () => {
    const p = storyPayloadSchema.parse({
      type: "story",
      body_text: "x",
      cast: [{ id: "c1", role: "character", image_url: "https://hero.png" }],
      pages: [
        {
          id: "p1",
          body_text: "p",
          items: [
            {
              id: "i1",
              registry_id: "c1",
              x_percent: 0,
              y_percent: 0,
              w_percent: 10,
              h_percent: 10,
              enter: { preset: "fade_in", duration_ms: 400 },
            },
          ],
        },
      ],
    });
    const pages = getNormalizedStoryPages(p);
    expect(pages[0].items[0].image_url).toBe("https://hero.png");
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

  it("normalizes auto_play true when page has page_enter action_sequences only", () => {
    const p = storyPayloadSchema.parse({
      type: "story",
      body_text: "Root",
      pages: [
        {
          id: "p1",
          body_text: "Hi",
          items: [],
          action_sequences: [
            {
              id: "seq1",
              event: "page_enter",
              steps: [
                {
                  id: "s1",
                  kind: "play_sound",
                  sound_url: "https://example.com/a.mp3",
                },
              ],
            },
          ],
        },
      ],
    });
    const pages = getNormalizedStoryPages(p);
    expect(pages[0].auto_play).toBe(true);
  });

  it("respects explicit auto_play false when page_enter sequences exist", () => {
    const p = storyPayloadSchema.parse({
      type: "story",
      body_text: "Root",
      pages: [
        {
          id: "p1",
          body_text: "Hi",
          items: [],
          auto_play: false,
          action_sequences: [
            {
              id: "seq1",
              event: "page_enter",
              steps: [
                {
                  id: "s1",
                  kind: "play_sound",
                  sound_url: "https://example.com/a.mp3",
                },
              ],
            },
          ],
        },
      ],
    });
    const pages = getNormalizedStoryPages(p);
    expect(pages[0].auto_play).toBe(false);
  });

  it("accepts path waypoints beyond legacy -5..105 for off-screen motion", () => {
    const p = storyPayloadSchema.parse({
      type: "story",
      body_text: "Root",
      pages: [
        {
          id: "p1",
          body_text: "Hi",
          items: [
            {
              id: "i1",
              image_url: "https://x",
              x_percent: 50,
              y_percent: 50,
              w_percent: 10,
              h_percent: 10,
              path: {
                waypoints: [
                  { x_percent: -30, y_percent: 120 },
                  { x_percent: 50, y_percent: 50 },
                ],
                duration_ms: 1000,
                easing: "ease-out",
              },
            },
          ],
        },
      ],
    });
    expect(p.pages?.[0].items[0].path?.waypoints[0].x_percent).toBe(-30);
    expect(p.pages?.[0].items[0].path?.easing).toBe("ease-out");
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

  it("sequence_complete: next from top-level or completion", () => {
    const r1 = getResolvedPhaseTransition({
      id: "a",
      is_start: true,
      next_phase_id: "b",
      completion: {
        type: "sequence_complete",
        sequence_id: "seq-1",
        next_phase_id: "c",
      },
    });
    expect(r1?.type).toBe("sequence_complete");
    if (r1?.type === "sequence_complete") {
      expect(r1.sequence_id).toBe("seq-1");
      expect(r1.next_phase_id).toBe("b");
    }
    const r2 = getResolvedPhaseTransition({
      id: "a",
      is_start: true,
      next_phase_id: null,
      completion: {
        type: "sequence_complete",
        sequence_id: "seq-1",
        next_phase_id: "c",
      },
    });
    if (r2?.type === "sequence_complete") {
      expect(r2.next_phase_id).toBe("c");
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

  it("tap_group: prefers top-level next_phase_id over completion.next_phase_id", () => {
    const r = getResolvedPhaseTransition({
      id: "a",
      is_start: true,
      next_phase_id: "b",
      completion: {
        type: "tap_group",
        group_id: "g1",
        next_phase_id: "c",
        advance_after_satisfaction: false,
      },
    });
    expect(r?.type).toBe("tap_group");
    if (r?.type === "tap_group") {
      expect(r.group_id).toBe("g1");
      expect(r.next_phase_id).toBe("b");
      expect(r.advance_after_satisfaction).toBe(false);
    }
  });

  it("pool_interaction_quota: resolves pool, thresholds, and next_phase_id", () => {
    const r = getResolvedPhaseTransition({
      id: "a",
      is_start: true,
      next_phase_id: "next",
      completion: {
        type: "pool_interaction_quota",
        pool_item_ids: ["x", "y"],
        min_taps_per_distinct_item: 1,
        advance_after_satisfaction: false,
        min_distinct_items: 2,
        min_aggregate_taps: 5,
        next_phase_id: "z",
      },
    });
    expect(r?.type).toBe("pool_interaction_quota");
    if (r?.type === "pool_interaction_quota") {
      expect(r.pool_item_ids).toEqual(["x", "y"]);
      expect(r.min_distinct_items).toBe(2);
      expect(r.min_aggregate_taps).toBe(5);
      expect(r.min_taps_per_distinct_item).toBe(1);
      expect(r.next_phase_id).toBe("next");
    }
  });
});

describe("storyPageSchema tap pool validation", () => {
  const imgItem = (id: string) => ({
    id,
    image_url: "https://example.com/i.png",
    x_percent: 0,
    y_percent: 0,
    w_percent: 10,
    h_percent: 10,
  });

  it("accepts tap_interaction_group with on_satisfy + tap_group phase completion", () => {
    const page = {
      id: "p1",
      body_text: "x",
      items: [
        {
          ...imgItem("parent"),
          tap_interaction_group: {
            id: "g1",
            child_item_ids: ["a", "b"],
            min_distinct_items: 2,
            on_satisfy_sequence_id: "sat",
          },
          action_sequences: [
            {
              id: "sat",
              event: "tap_group_satisfied" as const,
              steps: [{ id: "s1", kind: "emphasis" as const, target_item_id: "a" }],
            },
          ],
        },
        imgItem("a"),
        imgItem("b"),
      ],
      phases: [
        {
          id: "ph0",
          is_start: true,
          next_phase_id: "ph1",
          completion: { type: "auto", delay_ms: 0, next_phase_id: "ph1" },
        },
        {
          id: "ph1",
          next_phase_id: "ph2",
          completion: {
            type: "tap_group",
            group_id: "g1",
            next_phase_id: "ph2",
          },
        },
        { id: "ph2", completion: { type: "end_phase" } },
      ],
    };
    expect(storyPageSchema.safeParse(page).success).toBe(true);
  });

  it("rejects duplicate tap_interaction_group id on one page", () => {
    const page = {
      id: "p1",
      body_text: "x",
      items: [
        {
          ...imgItem("p1"),
          tap_interaction_group: {
            id: "g1",
            child_item_ids: ["a"],
            min_distinct_items: 1,
          },
        },
        {
          ...imgItem("p2"),
          tap_interaction_group: {
            id: "g1",
            child_item_ids: ["a"],
            min_distinct_items: 1,
          },
        },
        imgItem("a"),
      ],
    };
    const r = storyPageSchema.safeParse(page);
    expect(r.success).toBe(false);
    expect(
      r.error?.issues.some((i) =>
        String(i.message).includes("Duplicate tap_interaction_group"),
      ),
    ).toBe(true);
  });

  it("rejects tap_group completion when group_id is not defined on any item", () => {
    const page = {
      id: "p1",
      body_text: "x",
      items: [imgItem("a")],
      phases: [
        {
          id: "ph0",
          is_start: true,
          next_phase_id: "ph1",
          completion: { type: "auto", delay_ms: 0, next_phase_id: "ph1" },
        },
        {
          id: "ph1",
          next_phase_id: "ph2",
          completion: {
            type: "tap_group",
            group_id: "missing_group",
            next_phase_id: "ph2",
          },
        },
        { id: "ph2", completion: { type: "end_phase" } },
      ],
    };
    const r = storyPageSchema.safeParse(page);
    expect(r.success).toBe(false);
    expect(
      r.error?.issues.some((i) =>
        String(i.message).includes("completion tap_group references unknown group_id"),
      ),
    ).toBe(true);
  });

  it("rejects pool_interaction_quota when min_distinct_items exceeds pool size", () => {
    const page = {
      id: "p1",
      body_text: "x",
      items: [imgItem("a")],
      phases: [
        {
          id: "ph0",
          is_start: true,
          next_phase_id: "ph1",
          completion: { type: "auto", delay_ms: 0, next_phase_id: "ph1" },
        },
        {
          id: "ph1",
          next_phase_id: "ph2",
          completion: {
            type: "pool_interaction_quota",
            pool_item_ids: ["a"],
            min_distinct_items: 2,
            next_phase_id: "ph2",
          },
        },
        { id: "ph2", completion: { type: "end_phase" } },
      ],
    };
    const r = storyPageSchema.safeParse(page);
    expect(r.success).toBe(false);
    expect(
      r.error?.issues.some((i) =>
        String(i.message).includes("min_distinct_items exceeds pool size"),
      ),
    ).toBe(true);
  });

  it("rejects on_satisfy_sequence_id that does not point at tap_group_satisfied sequence", () => {
    const page = {
      id: "p1",
      body_text: "x",
      items: [
        {
          ...imgItem("parent"),
          tap_interaction_group: {
            id: "g1",
            child_item_ids: ["a"],
            min_distinct_items: 1,
            on_satisfy_sequence_id: "wrong",
          },
          action_sequences: [
            {
              id: "wrong",
              event: "click" as const,
              steps: [],
            },
          ],
        },
        imgItem("a"),
      ],
    };
    const r = storyPageSchema.safeParse(page);
    expect(r.success).toBe(false);
    expect(
      r.error?.issues.some((i) =>
        String(i.message).includes("tap_group_satisfied"),
      ),
    ).toBe(true);
  });
});

describe("storyPageSchema variable item validation", () => {
  const baseImage = (id: string) => ({
    id,
    image_url: "https://example.com/i.png",
    x_percent: 5,
    y_percent: 5,
    w_percent: 20,
    h_percent: 12,
  });

  it("accepts variable host with valid outcomes", () => {
    const page = {
      id: "p1",
      body_text: "x",
      items: [
        {
          ...baseImage("var1"),
          kind: "variable" as const,
          variable_config: {
            outcome_item_ids: ["choice_a", "choice_b"],
            initial_outcome_item_id: "choice_a",
          },
        },
        { ...baseImage("choice_a"), kind: "button" as const, text: "A" },
        { ...baseImage("choice_b"), kind: "button" as const, text: "B" },
      ],
    };
    expect(storyPageSchema.safeParse(page).success).toBe(true);
  });

  it("rejects variable host when outcome id is missing", () => {
    const page = {
      id: "p1",
      body_text: "x",
      items: [
        {
          ...baseImage("var1"),
          kind: "variable" as const,
          variable_config: { outcome_item_ids: ["missing_item"] },
        },
      ],
    };
    const r = storyPageSchema.safeParse(page);
    expect(r.success).toBe(false);
    expect(
      r.error?.issues.some((i) =>
        String(i.message).includes("references unknown outcome item id"),
      ),
    ).toBe(true);
  });

  it("rejects outcome item shared by multiple variable hosts", () => {
    const page = {
      id: "p1",
      body_text: "x",
      items: [
        {
          ...baseImage("var1"),
          kind: "variable" as const,
          variable_config: { outcome_item_ids: ["choice"] },
        },
        {
          ...baseImage("var2"),
          kind: "variable" as const,
          variable_config: { outcome_item_ids: ["choice"] },
        },
        { ...baseImage("choice"), kind: "button" as const, text: "Choice" },
      ],
    };
    const r = storyPageSchema.safeParse(page);
    expect(r.success).toBe(false);
    expect(
      r.error?.issues.some((i) => String(i.message).includes("already owned")),
    ).toBe(true);
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
