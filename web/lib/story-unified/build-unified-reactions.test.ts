import { describe, expect, it } from "vitest";
import { getNormalizedStoryPages, storyPageSchema, storyPayloadSchema } from "@/lib/lesson-schemas";
import { buildUnifiedReactionsFromStoryPage } from "@/lib/story-unified/build-unified-reactions";

const imgItem = (id: string) => ({
  id,
  image_url: "https://example.com/i.png",
  x_percent: 0,
  y_percent: 0,
  w_percent: 10,
  h_percent: 10,
});

describe("buildUnifiedReactionsFromStoryPage", () => {
  it("emits a single item_click for legacy on_click across explicit phases", () => {
    const page = storyPageSchema.parse({
      id: "p1",
      body_text: "x",
      items: [
        {
          ...imgItem("hot"),
          on_click: {
            triggers: [{ action: "play_sound" as const, sound_url: "https://example.com/s.mp3" }],
          },
        },
      ],
      phases: [
        {
          id: "ph0",
          is_start: true,
          next_phase_id: "ph1",
          completion: { type: "on_click" as const, target_item_id: "hot", next_phase_id: "ph1" },
        },
        {
          id: "ph1",
          next_phase_id: "ph2",
          completion: { type: "on_click" as const, target_item_id: "hot", next_phase_id: "ph2" },
        },
        { id: "ph2", completion: { type: "end_phase" as const } },
      ],
    });
    const payload = storyPayloadSchema.parse({
      type: "story",
      body_text: "root",
      pages: [page],
    });
    const norm = getNormalizedStoryPages(payload)[0]!;
    expect(norm.phasesExplicit).toBe(true);

    const { rows, parseErrors } = buildUnifiedReactionsFromStoryPage(norm);
    expect(parseErrors).toEqual([]);

    const legacyClicks = rows.filter(
      (r) => r.trigger === "item_click" && r.source_sequence_id === "legacy:item:hot:triggers",
    );
    expect(legacyClicks).toHaveLength(1);
    expect(legacyClicks[0]!.phase_id).toBe("ph0");
  });

  it("places tap_group_satisfied pool row on the phase that completes via that tap_group", () => {
    const page = storyPageSchema.parse({
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
          completion: { type: "auto" as const, delay_ms: 0, next_phase_id: "ph1" },
        },
        {
          id: "ph1",
          next_phase_id: "ph2",
          completion: {
            type: "tap_group" as const,
            group_id: "g1",
            next_phase_id: "ph2",
          },
        },
        { id: "ph2", completion: { type: "end_phase" as const } },
      ],
    });
    const payload = storyPayloadSchema.parse({
      type: "story",
      body_text: "root",
      pages: [page],
    });
    const norm = getNormalizedStoryPages(payload)[0]!;
    const { rows, parseErrors } = buildUnifiedReactionsFromStoryPage(norm);
    expect(parseErrors).toEqual([]);

    const satRows = rows.filter((r) => r.source_sequence_id === "sat" && r.trigger === "pool_quota_met");
    expect(satRows).toHaveLength(1);
    expect(satRows[0]!.phase_id).toBe("ph1");

    const poolCompletion = rows.filter(
      (r) => r.id === "norm:completion:ph1:pool" && r.trigger === "pool_quota_met",
    );
    expect(poolCompletion).toHaveLength(1);
  });

  it("emits all_drag_matched completion for drag_match + all_matched", () => {
    const page = storyPageSchema.parse({
      id: "p1",
      body_text: "Drag",
      items: [imgItem("mover"), { ...imgItem("target"), x_percent: 30 }],
      phases: [
        {
          id: "ph1",
          is_start: true,
          kind: "drag_match" as const,
          next_phase_id: "ph2",
          completion: { type: "all_matched" as const, next_phase_id: "ph2" },
          drag_match: {
            draggable_item_ids: ["mover"],
            target_item_ids: ["target"],
            correct_map: { mover: "target" },
            after_correct_match: "return_home" as const,
          },
        },
        { id: "ph2", completion: { type: "end_phase" as const } },
      ],
    });
    const norm = getNormalizedStoryPages(
      storyPayloadSchema.parse({ type: "story", body_text: "r", pages: [page] }),
    )[0]!;
    const { rows, parseErrors } = buildUnifiedReactionsFromStoryPage(norm);
    expect(parseErrors).toEqual([]);
    const row = rows.find((r) => r.id === "norm:completion:ph1:all_matched");
    expect(row?.trigger).toBe("all_drag_matched");
    expect(row?.reaction_body).toEqual({
      type: "serial",
      children: [
        {
          type: "output",
          leaf: { kind: "nav", nav: { kind: "phase_id", phase_id: "ph2" } },
        },
      ],
    });
  });

  it("emits pool_quota_met completion for pool_interaction_quota", () => {
    const page = storyPageSchema.parse({
      id: "p1",
      body_text: "Pool",
      items: [imgItem("a"), imgItem("b")],
      phases: [
        {
          id: "ph_pool",
          is_start: true,
          next_phase_id: "ph_next",
          completion: {
            type: "pool_interaction_quota" as const,
            pool_item_ids: ["a", "b"],
            min_aggregate_taps: 3,
            min_taps_per_distinct_item: 1,
            next_phase_id: "ph_next",
            advance_after_satisfaction: true,
          },
        },
        { id: "ph_next", completion: { type: "end_phase" as const } },
      ],
    });
    const norm = getNormalizedStoryPages(
      storyPayloadSchema.parse({ type: "story", body_text: "r", pages: [page] }),
    )[0]!;
    const { rows, parseErrors } = buildUnifiedReactionsFromStoryPage(norm);
    expect(parseErrors).toEqual([]);
    const row = rows.find((r) => r.id === "norm:completion:ph_pool:pool");
    expect(row?.trigger).toBe("pool_quota_met");
  });

  it("emits item_sequence_done for sequence_complete completion", () => {
    const page = storyPageSchema.parse({
      id: "p1",
      body_text: "x",
      items: [
        {
          ...imgItem("btn"),
          kind: "button" as const,
          text: "Tap",
          action_sequences: [
            {
              id: "clickSeq",
              event: "click" as const,
              steps: [{ id: "s1", kind: "tts" as const, tts_text: "Yo" }],
            },
          ],
        },
      ],
      phases: [
        {
          id: "ph0",
          is_start: true,
          next_phase_id: "ph1",
          completion: {
            type: "sequence_complete" as const,
            sequence_id: "clickSeq",
            next_phase_id: "ph1",
          },
        },
        { id: "ph1", completion: { type: "end_phase" as const } },
      ],
    });
    const norm = getNormalizedStoryPages(
      storyPayloadSchema.parse({ type: "story", body_text: "r", pages: [page] }),
    )[0]!;
    const { rows, parseErrors } = buildUnifiedReactionsFromStoryPage(norm);
    expect(parseErrors).toEqual([]);
    const done = rows.find((r) => r.trigger === "item_sequence_done");
    expect(done?.advance_after_sequence_id).toBe("clickSeq");
    expect(done?.owner_item_id).toBe("btn");
  });

  it("maps next_click step timings to tap_chain reaction_body", () => {
    const page = storyPageSchema.parse({
      id: "p1",
      body_text: "x",
      items: [
        {
          ...imgItem("tapme"),
          kind: "button" as const,
          text: "Go",
          action_sequences: [
            {
              id: "seqTap",
              event: "click" as const,
              steps: [
                {
                  id: "a",
                  kind: "emphasis" as const,
                  emphasis_preset: "grow" as const,
                  target_item_id: "tapme",
                  timing: "next_click" as const,
                },
                {
                  id: "b",
                  kind: "tts" as const,
                  tts_text: "Second",
                  timing: "next_click" as const,
                },
              ],
            },
          ],
        },
      ],
      phases: [{ id: "ph0", is_start: true, completion: { type: "end_phase" as const } }],
    });
    const norm = getNormalizedStoryPages(
      storyPayloadSchema.parse({ type: "story", body_text: "r", pages: [page] }),
    )[0]!;
    const { rows, parseErrors } = buildUnifiedReactionsFromStoryPage(norm);
    expect(parseErrors).toEqual([]);
    const row = rows.find((r) => r.source_sequence_id === "seqTap");
    expect(row?.reaction_body.type).toBe("tap_chain");
  });

  it("keeps deterministic row id set for the same page across builds", () => {
    const page = storyPageSchema.parse({
      id: "p1",
      body_text: "x",
      items: [imgItem("a")],
      phases: [
        {
          id: "ph0",
          is_start: true,
          next_phase_id: "ph1",
          completion: { type: "auto" as const, delay_ms: 100, next_phase_id: "ph1" },
        },
        { id: "ph1", completion: { type: "end_phase" as const } },
      ],
    });
    const norm = getNormalizedStoryPages(
      storyPayloadSchema.parse({ type: "story", body_text: "r", pages: [page] }),
    )[0]!;
    const ids1 = buildUnifiedReactionsFromStoryPage(norm)
      .rows.map((r) => r.id ?? r.source_sequence_id ?? "")
      .sort();
    const ids2 = buildUnifiedReactionsFromStoryPage(norm)
      .rows.map((r) => r.id ?? r.source_sequence_id ?? "")
      .sort();
    expect(ids1).toEqual(ids2);
  });

  it("emits timer completion row with delay for auto transition", () => {
    const page = storyPageSchema.parse({
      id: "p1",
      body_text: "x",
      items: [imgItem("a")],
      phases: [
        {
          id: "ph0",
          is_start: true,
          next_phase_id: "ph1",
          completion: { type: "auto" as const, delay_ms: 500, next_phase_id: "ph1" },
        },
        { id: "ph1", completion: { type: "end_phase" as const } },
      ],
    });
    const norm = getNormalizedStoryPages(
      storyPayloadSchema.parse({ type: "story", body_text: "r", pages: [page] }),
    )[0]!;
    const { rows, parseErrors } = buildUnifiedReactionsFromStoryPage(norm);
    expect(parseErrors).toEqual([]);
    const timer = rows.find((r) => r.id === "norm:completion:ph0:auto");
    expect(timer?.trigger).toBe("timer");
    expect(timer?.timer_delay_ms).toBe(500);
  });
});
