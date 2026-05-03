import { describe, expect, it } from "vitest";
import type { StoryPage, StoryPagePhase } from "@/lib/lesson-schemas";
import { storyUnifiedReactionRowSchema } from "@/lib/story-unified/schema";
import { itemKindAllowsInfoPopup, validateReactionRow } from "@/lib/story-unified/validate-reaction-row";

const basePage = (): StoryPage => ({
  id: "p1",
  body_text: "",
  image_fit: "contain",
  items: [
    {
      id: "img1",
      kind: "image",
      image_url: "https://example.com/x.png",
      x_percent: 0,
      y_percent: 0,
      w_percent: 20,
      h_percent: 20,
      show_card: true,
      show_on_start: true,
      image_scale: 1,
      z_index: 0,
    },
    {
      id: "btn1",
      kind: "button",
      text: "OK",
      x_percent: 10,
      y_percent: 10,
      w_percent: 20,
      h_percent: 10,
      show_card: true,
      show_on_start: true,
      image_scale: 1,
      z_index: 0,
    },
    {
      id: "mover",
      kind: "image",
      image_url: "https://example.com/y.png",
      x_percent: 30,
      y_percent: 0,
      w_percent: 10,
      h_percent: 10,
      show_card: true,
      show_on_start: true,
      image_scale: 1,
      z_index: 0,
      path: {
        waypoints: [
          { x_percent: 30, y_percent: 0 },
          { x_percent: 50, y_percent: 20 },
        ],
        duration_ms: 400,
      },
    },
  ],
});

const phase = (over: Partial<StoryPagePhase> = {}): StoryPagePhase => ({
  id: "ph1",
  name: "Intro",
  ...over,
  is_start: over.is_start ?? false,
});

describe("itemKindAllowsInfoPopup", () => {
  it("allows button and info_balloon", () => {
    expect(itemKindAllowsInfoPopup("button")).toBe(true);
    expect(itemKindAllowsInfoPopup("info_balloon")).toBe(true);
    expect(itemKindAllowsInfoPopup("image")).toBe(false);
    expect(itemKindAllowsInfoPopup(undefined)).toBe(false);
  });
});

describe("validateReactionRow", () => {
  it("errors when phase is null", () => {
    const row = storyUnifiedReactionRowSchema.parse({
      phase_id: "ph1",
      trigger: "phase_enter",
      reaction_body: { type: "output", leaf: { kind: "speak", mode: "literal", text: "Hi" } },
    });
    const issues = validateReactionRow(row, basePage(), null);
    expect(issues.some((i) => i.code === "phase_required")).toBe(true);
  });

  it("errors item_click without owner_item_id", () => {
    const row = storyUnifiedReactionRowSchema.parse({
      phase_id: "ph1",
      trigger: "item_click",
      reaction_body: { type: "output", leaf: { kind: "speak", mode: "literal", text: "Hi" } },
    });
    const issues = validateReactionRow(row, basePage(), phase());
    expect(issues.some((i) => i.code === "item_click_requires_owner")).toBe(true);
  });

  it("errors item_sequence_done without owner_item_id", () => {
    const row = storyUnifiedReactionRowSchema.parse({
      phase_id: "ph1",
      trigger: "item_sequence_done",
      reaction_body: { type: "output", leaf: { kind: "speak", mode: "literal", text: "Hi" } },
    });
    const issues = validateReactionRow(row, basePage(), phase());
    expect(issues.some((i) => i.code === "item_sequence_done_requires_owner")).toBe(true);
  });

  it("errors all_drag_matched when phase is not drag_match", () => {
    const row = storyUnifiedReactionRowSchema.parse({
      phase_id: "ph1",
      trigger: "all_drag_matched",
      reaction_body: {
        type: "output",
        leaf: { kind: "nav", nav: { kind: "next_phase" } },
      },
    });
    const issues = validateReactionRow(row, basePage(), phase({ kind: "click_to_advance" }));
    expect(issues.some((i) => i.code === "all_drag_matched_requires_drag_match")).toBe(true);
  });

  it("warns all_drag_matched without phase nav when drag_match", () => {
    const row = storyUnifiedReactionRowSchema.parse({
      phase_id: "ph1",
      trigger: "all_drag_matched",
      reaction_body: {
        type: "output",
        leaf: { kind: "speak", mode: "literal", text: "Done" },
      },
    });
    const ph = phase({
      kind: "drag_match",
      drag_match: {
        draggable_item_ids: ["mover"],
        target_item_ids: ["img1"],
        correct_map: { mover: "img1" },
        after_correct_match: "stick_on_target",
      },
    });
    const issues = validateReactionRow(row, basePage(), ph);
    expect(issues.some((i) => i.code === "all_drag_matched_nav_suggested")).toBe(true);
  });

  it("errors pool_quota_met without pool config", () => {
    const row = storyUnifiedReactionRowSchema.parse({
      phase_id: "ph1",
      trigger: "pool_quota_met",
      reaction_body: { type: "output", leaf: { kind: "speak", mode: "literal", text: "ok" } },
    });
    const issues = validateReactionRow(row, basePage(), phase());
    expect(issues.some((i) => i.code === "pool_quota_met_requires_pool")).toBe(true);
  });

  it("accepts pool_quota_met when phase has pool_interaction_quota", () => {
    const row = storyUnifiedReactionRowSchema.parse({
      phase_id: "ph1",
      trigger: "pool_quota_met",
      reaction_body: { type: "output", leaf: { kind: "speak", mode: "literal", text: "ok" } },
    });
    const ph = phase({
      completion: {
        type: "pool_interaction_quota",
        pool_item_ids: ["btn1"],
        min_taps_per_distinct_item: 1,
        advance_after_satisfaction: false,
        min_aggregate_taps: 2,
        next_phase_id: "ph2",
      },
      next_phase_id: "ph2",
    });
    const issues = validateReactionRow(row, basePage(), ph);
    expect(issues.filter((i) => i.level === "error")).toHaveLength(0);
  });

  it("errors path_move when target has no path", () => {
    const row = storyUnifiedReactionRowSchema.parse({
      phase_id: "ph1",
      trigger: "phase_enter",
      reaction_body: {
        type: "output",
        leaf: { kind: "path_move", target_item_id: "img1" },
      },
    });
    const issues = validateReactionRow(row, basePage(), phase());
    expect(issues.some((i) => i.code === "path_move_requires_path")).toBe(true);
  });

  it("accepts path_move when target has path", () => {
    const row = storyUnifiedReactionRowSchema.parse({
      phase_id: "ph1",
      trigger: "phase_enter",
      reaction_body: {
        type: "output",
        leaf: { kind: "path_move", target_item_id: "mover" },
      },
    });
    const issues = validateReactionRow(row, basePage(), phase());
    expect(issues.filter((i) => i.level === "error")).toHaveLength(0);
  });

  it("errors info_popup on image item", () => {
    const row = storyUnifiedReactionRowSchema.parse({
      phase_id: "ph1",
      trigger: "item_click",
      owner_item_id: "img1",
      reaction_body: {
        type: "output",
        leaf: { kind: "info_popup", title: "T", body: "B", target_item_id: "img1" },
      },
    });
    const issues = validateReactionRow(row, basePage(), phase());
    expect(issues.some((i) => i.code === "info_popup_invalid_kind")).toBe(true);
  });

  it("accepts info_popup on button with target_item_id", () => {
    const row = storyUnifiedReactionRowSchema.parse({
      phase_id: "ph1",
      trigger: "item_click",
      owner_item_id: "btn1",
      reaction_body: {
        type: "output",
        leaf: { kind: "info_popup", title: "T", body: "B", target_item_id: "btn1" },
      },
    });
    const issues = validateReactionRow(row, basePage(), phase());
    expect(issues.filter((i) => i.level === "error")).toHaveLength(0);
  });

  it("warns item_click with lesson_screen nav outside tap_chain", () => {
    const row = storyUnifiedReactionRowSchema.parse({
      phase_id: "ph1",
      trigger: "item_click",
      owner_item_id: "btn1",
      reaction_body: {
        type: "output",
        leaf: { kind: "nav", nav: { kind: "lesson_screen" } },
      },
    });
    const issues = validateReactionRow(row, basePage(), phase());
    expect(issues.some((i) => i.code === "item_click_lesson_nav")).toBe(true);
  });

  it("does not warn item_click with lesson_screen only inside tap_chain", () => {
    const row = storyUnifiedReactionRowSchema.parse({
      phase_id: "ph1",
      trigger: "item_click",
      owner_item_id: "btn1",
      reaction_body: {
        type: "tap_chain",
        children: [
          {
            type: "output",
            leaf: { kind: "nav", nav: { kind: "lesson_screen" } },
          },
        ],
      },
    });
    const issues = validateReactionRow(row, basePage(), phase());
    expect(issues.some((i) => i.code === "item_click_lesson_nav")).toBe(false);
  });
});
